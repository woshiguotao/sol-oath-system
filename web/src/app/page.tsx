'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, Skull, AlertTriangle, Fingerprint, LayoutList, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// 引入最核心的 Anchor 客户端支持来唤起真实的 Solana 合约调用
import * as anchor from '@coral-xyz/anchor';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';

const WalletMultiButton = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

// 内联简化的 IDL 结构 (仅提供前端所需的 deposit 接口字典)
const IDLJSON = {
    version: "0.1.0",
    name: "cyber_judge",
    instructions: [
        {
            name: "deposit",
            discriminator: [242, 35, 198, 137, 82, 225, 242, 182],
            accounts: [
                { name: "state", writable: true, signer: false },
                { name: "user", writable: true, signer: true },
                { name: "oracle", writable: false, signer: false },
                { name: "systemProgram", writable: false, signer: false }
            ],
            args: [
                { name: "taskId", type: "i64" },
                { name: "amount", type: "u64" },
                { name: "deadline", type: "i64" }
            ]
        }
    ]
};

export default function Home() {
    const { publicKey } = useWallet();
    const anchorWallet = useAnchorWallet();
    const { connection } = useConnection();

    // 提取出配置的合约地址，以便在界面上展示
    const programIdStr = process.env.NEXT_PUBLIC_PROGRAM_ID || "42F4X3rrvUsbTBUHiEj8fMQzuqkD32y5imeEGtB2KZE9";

    const [goal, setGoal] = useState('');
    const [amount, setAmount] = useState('0.1');
    const [isDepositing, setIsDepositing] = useState(false);
    const [successTx, setSuccessTx] = useState<string | null>(null);

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const router = useRouter();

    const handleDeposit = async () => {
        if (!publicKey || !anchorWallet) return alert("请确保证钱包已连接且解锁！");
        setIsDepositing(true);
        try {
            // == 🌟 核心：发起真实的链上智能合约调用 🌟 ==
            console.log("正在唤起前端 Anchor Provider...");

            // 【终极架构防崩术】拦截转换 AnchorWallet 代理结构中的 publicKey
            // 否则 Anchor 的底层引擎在拼装主网交易把钱包设为 feePayer 时，会因为包实例不对报错 Cannot read properties of undefined (reading '_bn')
            const safeProviderWallet = {
                signTransaction: anchorWallet.signTransaction,
                signAllTransactions: anchorWallet.signAllTransactions,
                publicKey: new anchor.web3.PublicKey(anchorWallet.publicKey.toBase58())
            };

            const provider = new anchor.AnchorProvider(connection, safeProviderWallet, {
                preflightCommitment: "confirmed"
            });

            // 获取我们设定在环境变量中的部署地址
            const programId = new anchor.web3.PublicKey(programIdStr);
            console.log(`正在连接到智能合约: ${programId.toBase58()}`);

            // 构建 Program 实例
            const program = new anchor.Program({ ...IDLJSON, address: programIdStr } as unknown as anchor.Idl, provider);

            // 生成唯一任务 ID (时间戳)
            const taskId = Date.now();
            const taskIdBn = new anchor.BN(taskId);

            // 自动推导出属于该用户的 PDA (加入 taskId 种子以支持多开)
            const [statePda] = anchor.web3.PublicKey.findProgramAddressSync(
                [
                    Buffer.from("cyber_judge"), 
                    publicKey.toBuffer(),
                    taskIdBn.toArrayLike(Buffer, 'le', 8)
                ],
                programId
            );

            // 充当 AI 节点的钱包公钥（作为罚没时的收款方），通过环境变量配置
            const oraclePubkeyStr = process.env.NEXT_PUBLIC_ORACLE_PUBKEY || "11111111111111111111111111111112";
            const oraclePubkey = new anchor.web3.PublicKey(oraclePubkeyStr);

            // 数据类型转换与双包隔离防崩 (绝对规避 _bn 解析报错)
            const amountLamports = new anchor.BN(Math.floor(parseFloat(amount) * anchor.web3.LAMPORTS_PER_SOL).toString());
            const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 86400); // 假定期限为一天后
            const safeUserPubKey = new anchor.web3.PublicKey(publicKey.toBase58());

            console.log("等待用户批准 Phantom 交易签名...");
            const tx = await program.methods.deposit(taskIdBn, amountLamports, deadline)
                .accounts({
                    state: statePda,
                    user: safeUserPubKey,
                    oracle: oraclePubkey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .rpc();

            console.log("✅ 被确认的交易哈希:", tx);

            // == 交易成功后：并行将本地信息也写入大厅 Mock 数据库以供展示 == 
            const newPledge = {
                id: statePda.toBase58(), // 极其真实的联动：使用智能合约下发的 PDA 地址作为前端的任务 UUID
                taskId: taskId,
                goal: goal,
                amount: amount,
                status: 'active',
                timestamp: Date.now(),
                txHash: tx
            };
            const existing = JSON.parse(localStorage.getItem('cyber_pledges') || '[]');
            localStorage.setItem('cyber_pledges', JSON.stringify([newPledge, ...existing]));

            // 触发自定义弹窗，代替之前的 router.push 和 alert
            setSuccessTx(tx);
        } catch (e: any) {
            console.error("合约执行崩溃:", e);
            alert("链上调用失败或被您拒绝！错误详情：" + (e.message || String(e)));
        } finally {
            setIsDepositing(false);
        }
    };

    return (
        <main className="relative min-h-screen pb-20 overflow-hidden font-sans">
            <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
                <Image src="/cyber_judge.png" alt="Cyberpunk Background" fill className="object-cover mix-blend-luminosity" priority />
                <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/40 via-neutral-950/80 to-neutral-950"></div>
            </div>

            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-red-600/10 rounded-full blur-[140px] pointer-events-none"></div>

            <nav className="relative z-10 w-full flex justify-between items-center py-5 px-8 border-b border-red-900/30 bg-neutral-950/80 backdrop-blur-xl">
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
                    <h1 className="text-2xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">
                        赛博判官
                    </h1>
                </Link>
                <div className="flex items-center gap-6">
                    <Link href="/list" className="flex items-center gap-2 text-neutral-300 font-bold hover:text-red-400 transition-colors uppercase tracking-widest text-sm">
                        <LayoutList className="w-5 h-5" /> 誓言大厅
                    </Link>
                    <WalletMultiButton className="!bg-red-600 hover:!bg-red-700 !rounded-none !font-bold uppercase !tracking-wide transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]" />
                </div>
            </nav>

            <div className="relative z-10 max-w-6xl mx-auto mt-20 px-4 grid grid-cols-1 lg:grid-cols-2 gap-16">

                <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="flex flex-col justify-center">
                    <div className="inline-flex items-center gap-2 border border-red-500/30 bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6 w-fit">
                        <AlertTriangle className="w-4 h-4" />
                        高风险 AI 托管协议 & x402 Agent 经济系统
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black uppercase leading-[1.1] tracking-tighter mb-8 text-neutral-100">
                        目标未达，<br />
                        怒燃您的<span className="text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-red-800 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">全副身家</span>。
                    </h2>
                    <p className="text-neutral-400 text-lg md:text-xl mb-10 max-w-md leading-relaxed">
                        终极 Web3 惩罚协议。将您的 SOL 真实在链上打入智能合约的金库，并在大厅内传唤原生 x402 的 AI 判官断案。一旦验证失败，您的资金将直接在主网被划扣粉碎！
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-orange-400 border border-orange-900/50 bg-orange-950/40 px-5 py-3 rounded-lg backdrop-blur-md cursor-default shadow-[0_0_10px_rgba(234,88,12,0.1)]">
                            <Fingerprint className="w-5 h-5" />
                            底座直通 Anchor 原生交易
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-b from-red-600 to-orange-600 opacity-20 blur-xl rounded-3xl"></div>
                    <div className="relative border border-red-900/50 bg-neutral-950/90 backdrop-blur-2xl p-8 lg:p-10 rounded-2xl shadow-[0_0_40px_rgba(220,38,38,0.1)]">
                        <div className="space-y-8">

                            <div className="space-y-4 border-b border-neutral-800 pb-6">
                                <div>
                                    <h3 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3 text-neutral-100">
                                        <Skull className="w-8 h-8 text-red-500" />
                                        签订契约
                                    </h3>
                                    <p className="text-sm text-neutral-400 font-medium mt-2">唤起钱包，在区块链节点永恒记录您的赌注。</p>
                                </div>
                                <div className="inline-flex flex-col sm:flex-row sm:items-center gap-2 bg-neutral-900/50 border border-neutral-800 rounded px-3 py-2 w-full">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-neutral-500 whitespace-nowrap">Target Program</span>
                                    <a href={`https://explorer.solana.com/address/${programIdStr}?cluster=devnet`} target="_blank" rel="noreferrer" className="text-xs font-mono text-neutral-300 hover:text-red-400 transition-colors truncate">
                                        {programIdStr}
                                    </a>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="block text-xs font-black uppercase tracking-widest text-neutral-500">我的誓言设定 (挑战目标)</label>
                                    <input type="text" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="例如：今晚8点前绕小区跑完5公里..." className="w-full bg-neutral-900/80 border border-neutral-800 rounded-lg px-4 py-4 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium placeholder-neutral-600" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-black uppercase tracking-widest text-neutral-500">抵押惩罚金 (代币数量)</label>
                                    <div className="relative">
                                        <input type="number" step="0.1" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-neutral-900/80 border border-neutral-800 rounded-lg pl-4 pr-16 py-4 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono text-lg" />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">SOL</span>
                                    </div>
                                </div>

                                {mounted && publicKey ? (
                                    <button onClick={handleDeposit} disabled={isDepositing || !goal || Number(amount) <= 0} className="relative w-full overflow-hidden bg-neutral-800 group rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-neutral-700 hover:border-red-500">
                                        <div className="absolute inset-0 bg-red-600 transition-transform duration-300 translate-y-[100%] group-hover:translate-y-0"></div>
                                        <div className="relative z-10 font-black uppercase tracking-widest py-5 text-sm text-white flex justify-center items-center gap-2">
                                            {isDepositing ? <span className="animate-pulse">正在等待您的 Phantom 签名授权...</span> : <>🔗 联通网关：真实上链锁定</>}
                                        </div>
                                    </button>
                                ) : (
                                    <div className="w-full bg-neutral-900/50 border border-neutral-800 border-dashed text-neutral-500 font-bold uppercase tracking-widest py-5 rounded-lg text-center text-sm">
                                        {mounted ? "请先连接您的 Solana 钱包以立下誓言" : "正在初始化安全链路..."}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            <AnimatePresence>
                {successTx && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="bg-neutral-900 border border-red-500/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.15)] max-w-md w-full relative overflow-hidden">
                            {/* Top Accent Line */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-500 shadow-[0_0_20px_rgba(220,38,38,1)]"></div>
                            
                            <div className="flex flex-col items-center text-center relative z-10">
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(220,38,38,0.2)]">
                                    <CheckCircle className="w-10 h-10 text-red-500" />
                                </motion.div>
                                
                                <h3 className="text-2xl font-black uppercase tracking-widest text-white mb-3">契约锁定成功</h3>
                                <p className="text-neutral-400 font-medium mb-8 leading-relaxed">
                                    您的 <span className="text-red-400 font-bold">{amount} SOL</span> 已被注入智能合约！<br/>AI 判官已就位，请务必达成目标，<br/>否则资金将被无情粉碎。
                                </p>
                                
                                <div className="bg-black/60 border border-neutral-800 rounded-lg p-4 w-full mb-8 text-left group hover:border-red-900/50 transition-colors">
                                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2 font-black flex items-center justify-between">
                                        链上交易回执 <Zap className="w-3 h-3 text-orange-500" />
                                    </p>
                                    <a href={`https://explorer.solana.com/tx/${successTx}?cluster=devnet`} target="_blank" rel="noreferrer" className="text-xs font-mono text-red-400/80 hover:text-red-400 transition-colors break-all leading-tight block">
                                        {successTx}
                                    </a>
                                </div>
                                
                                <button onClick={() => router.push('/list')} className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-orange-600 text-white font-black uppercase tracking-widest py-4 rounded-lg transition-all shadow-[0_4px_20px_rgba(220,38,38,0.3)] hover:shadow-[0_4px_25px_rgba(220,38,38,0.5)] active:scale-[0.98]">
                                    进入誓言大厅查看
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
