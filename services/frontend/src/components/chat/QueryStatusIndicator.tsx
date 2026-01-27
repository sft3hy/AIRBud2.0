import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    BrainCircuit,
    Database,
    Network,
    Sparkles,

    Loader2,
    ScanLine,
} from "lucide-react";

interface QueryStatusIndicatorProps {
    status: string;
}

// --- Mini Animation Components ---

const OptimizingAnim = () => (
    <div className="relative flex items-center justify-center w-8 h-8">
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, ease: "linear", repeat: Infinity }}
            className="absolute inset-0 border-2 border-t-primary border-r-transparent border-b-primary/30 border-l-transparent rounded-full"
        />
        <BrainCircuit className="w-4 h-4 text-primary animate-pulse" />
    </div>
);

const ScanningAnim = () => (
    <div className="relative flex items-center justify-center w-8 h-8">
        <div className="absolute inset-0 bg-green-500/10 rounded-full animate-ping opacity-20" />
        <Database className="w-4 h-4 text-green-500 z-10" />
        <motion.div
            className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border border-green-500"
            animate={{ y: [-2, 2, -2] }}
            transition={{ repeat: Infinity, duration: 2 }}
        >
            <ScanLine className="w-2 h-2 text-green-400" />
        </motion.div>
    </div>
);

const GraphAnim = () => (
    <div className="relative flex items-center justify-center w-8 h-8">
        <Network className="w-4 h-4 text-orange-500" />
        {[0, 120, 240].map((deg, i) => (
            <motion.div
                key={i}
                className="absolute w-1 h-1 bg-orange-400 rounded-full"
                animate={{
                    x: [
                        Math.cos((deg * Math.PI) / 180) * 8,
                        Math.cos(((deg + 360) * Math.PI) / 180) * 8,
                    ],
                    y: [
                        Math.sin((deg * Math.PI) / 180) * 8,
                        Math.sin(((deg + 360) * Math.PI) / 180) * 8,
                    ],
                }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            />
        ))}
    </div>
);

const SynthesisAnim = () => (
    <div className="relative flex items-center justify-center w-8 h-8">
        <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
        <motion.div
            className="absolute inset-0 border border-purple-500/30 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
        />
    </div>
);

const DefaultAnim = () => (
    <div className="relative flex items-center justify-center w-8 h-8">
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
    </div>
);

export const QueryStatusIndicator: React.FC<QueryStatusIndicatorProps> = ({ status }) => {
    const getAnim = () => {
        const s = status.toLowerCase();
        if (s.includes("optimizing")) return <OptimizingAnim />;
        if (s.includes("scanning") || s.includes("vectors") || s.includes("indexes")) return <ScanningAnim />;
        if (s.includes("graph") || s.includes("knowledge")) return <GraphAnim />;
        if (s.includes("synthesizing") || s.includes("generating")) return <SynthesisAnim />;
        return <DefaultAnim />;
    };

    const getColor = () => {
        const s = status.toLowerCase();
        if (s.includes("optimizing")) return "text-primary";
        if (s.includes("scanning")) return "text-green-500";
        if (s.includes("graph")) return "text-orange-500";
        if (s.includes("synthesizing")) return "text-purple-500";
        return "text-muted-foreground";
    };

    return (
        <div className="flex items-center gap-3 bg-card/90 backdrop-blur border px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm transition-all duration-500">
            <AnimatePresence mode="wait">
                <motion.div
                    key={status} // Key changes trigger exit/enter
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {getAnim()}
                </motion.div>
            </AnimatePresence>

            <div className="flex flex-col">
                <motion.span
                    key={status}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-sm font-medium ${getColor()}`}
                >
                    {status}
                </motion.span>
            </div>
        </div>
    );
};
