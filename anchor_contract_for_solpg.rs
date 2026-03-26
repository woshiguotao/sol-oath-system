use anchor_lang::prelude::*;

declare_id!("42F4X3rrvUsbTBUHiEj8fMQzuqkD32y5imeEGtB2KZE9"); // 注意：请在 SolPG 部署后将生成的 Program ID 替换至此处

#[program]
pub mod cyber_judge {
    use super::*;

    pub fn deposit(ctx: Context<Deposit>, task_id: i64, amount: u64, deadline: i64) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.task_id = task_id;
        state.user = ctx.accounts.user.key();
        state.oracle = ctx.accounts.oracle.key(); // Agent 作为监督人的公钥
        state.amount = amount;
        state.deadline = deadline;
        state.is_resolved = false;

        // 执行资金锁定（转账至 PDA）
        let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &state.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                ctx.accounts.user.to_account_info(),
                state.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ]
        )?;

        msg!("Deposit successful! {} lamports locked.", amount);
        Ok(())
    }

    pub fn resolve(ctx: Context<Resolve>, task_id: i64, is_success: bool) -> Result<()> {
        let state = &mut ctx.accounts.state;
        
        require!(ctx.accounts.oracle.key() == state.oracle, ErrorCode::Unauthorized);
        require!(!state.is_resolved, ErrorCode::AlreadyResolved);

        let amount = state.amount;
        state.is_resolved = true;
        
        if is_success {
            // 挑战成功，退回资金给用户
            state.sub_lamports(amount)?;
            ctx.accounts.user.add_lamports(amount)?;
            msg!("Challenge Success! Funds returned to user.");
        } else {
            // 挑战失败，资金被 Agent(Oracle) 罚没 (为了MVP演示直观，转给Agent地址)
            state.sub_lamports(amount)?;
            ctx.accounts.oracle.add_lamports(amount)?;
            msg!("Challenge Failed! Funds seized by the Oracle.");
        }
        
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(task_id: i64)]
pub struct Deposit<'info> {
    #[account(
        init, 
        payer = user, 
        space = 8 + 8 + 32 + 32 + 8 + 8 + 1,   // Discriminator + task_id + User + Oracle + Amount + Deadline + Bool
        seeds = [b"cyber_judge", user.key().as_ref(), task_id.to_le_bytes().as_ref()], 
        bump
    )]
    pub state: Account<'info, ChallengeState>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: 监督 AI 的钱包公钥，无需检查数据格式
    pub oracle: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(task_id: i64)]
pub struct Resolve<'info> {
    #[account(
        mut, 
        seeds = [b"cyber_judge", user.key().as_ref(), task_id.to_le_bytes().as_ref()], 
        bump, 
        has_one = user, 
        has_one = oracle // 确保执行者必定是原先配置的 Oracle
    )]
    pub state: Account<'info, ChallengeState>,
    
    #[account(mut)]
    /// CHECK: 挑战者账户（仅用于接收退款）
    pub user: AccountInfo<'info>,
    
    #[account(mut)]
    pub oracle: Signer<'info>, // AI 必须提供其私钥签名
}

#[account]
pub struct ChallengeState {
    pub task_id: i64,
    pub user: Pubkey,
    pub oracle: Pubkey,
    pub amount: u64,
    pub deadline: i64,
    pub is_resolved: bool,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Only the designated oracle can resolve this challenge.")]
    Unauthorized,
    #[msg("This challenge is already resolved.")]
    AlreadyResolved,
}
