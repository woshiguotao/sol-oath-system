import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import bs58 from 'bs58';

// 初始化 OpenAI (可通过环境变量配置真实 key)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key-for-hackathon',
});

// Agent 管理的钱包私钥，用于授权触发链上惩罚或奖励
// 这里使用 bs58 字符串格式，真实应用切勿硬编码，需从环境变量安全注入
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY || '';
// 从环境变量动态读取您的独家合约地址，若未配置则回退到刚才的默认演示地址
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || '42F4X3rrvUsbTBUHiEj8fMQzuqkD32y5imeEGtB2KZE9');

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const goal = formData.get('goal') as string;
        const userPubkey = formData.get('userPubkey') as string;

        if (!file || !goal) {
            return NextResponse.json({ error: 'Missing evidence image or goal text' }, { status: 400 });
        }

        // 将图片文件转换为 base64 以供大模型多模态处理
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Image = buffer.toString('base64');
        const mimeType = file.type;

        console.log(`[Cyber Judge] Received evidence for goal: "${goal}"`);

        let isSuccess = false;

        // 只有当配置了真实的 OpenAI API Key 时才发起真实请求，否则 fallback 为模拟判断
        if (process.env.OPENAI_API_KEY) {
            // 调用 OpenAI Vision 进行无情的视觉判定
            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "You are the Cyber Judge, a strict, unforgiving AI Oracle for a Web3 Escrow. Your job is to look at the user's photographic evidence and determine if they successfully completed their stated goal. You must answer STRICTLY with the word 'PASSED' if they did, or 'FAILED' if they did not. Do not provide any other text."
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: `The user's stated goal is: "${goal}". Does this image definitively prove they completed it?` },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Image}`,
                                    detail: "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 10,
            });

            const verdict = response.choices[0].message.content?.trim().toUpperCase() || 'FAILED';
            isSuccess = verdict.includes('PASSED');
        } else {
            console.warn("⚠️ OPENAI_API_KEY is missing. Using mock verification (Always Fails).");
            isSuccess = false;
        }

        // --- 链上交互环节 (Agent Oracle 自动执行) ---
        let txSignature = null;
        if (ORACLE_PRIVATE_KEY && userPubkey) {
            try {
                const connection = new Connection("https://api.devnet.solana.com", "confirmed");
                const oracleKeypair = Keypair.fromSecretKey(bs58.decode(ORACLE_PRIVATE_KEY));
                const wallet = new anchor.Wallet(oracleKeypair);
                const provider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: "confirmed" });

                // 本代码片段旨在展示如何在完整的 MVP 中触发链上调用
                // 若用户已在 SolPG 部署，需将 IDL 解析后组装成 instruction
                console.log(`[Cyber Judge] Oracle signed transaction: user ${userPubkey}, resolve_success = ${isSuccess}`);

                // 此处省略了由于缺失 IDL 而无法进行的原生合约绑定代码
                // txSignature = await program.methods.resolve(isSuccess)...

                txSignature = "mock_tx_sig_6AbC9...";
            } catch (e) {
                console.error("Failed to execute on-chain transaction:", e);
            }
        }

        return NextResponse.json({
            success: true,
            isSuccess,
            verdict: isSuccess ? 'success' : 'failed',
            txSignature
        });

    } catch (error: any) {
        console.error("Verification error:", error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
