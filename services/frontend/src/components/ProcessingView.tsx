import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Eye,
  BrainCircuit,
  Network,
  CheckCircle2,
  ScanLine,
  Database,
  Music,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProcessingViewProps {
  status: {
    stage: "parsing" | "vision" | "indexing" | "graph" | "done" | "error";
    step: string;
    progress: number;
  };
}

const variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.3 } },
};

// --- STAGE 1: PARSING (Document Deconstruction) ---
const ParsingAnim = () => (
  <div className="relative w-32 h-40 bg-white/10 border-2 border-primary/50 rounded-lg p-2 flex flex-col gap-2 overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.3)]">
    <motion.div
      className="w-full h-2 bg-primary/40 rounded"
      animate={{ width: ["40%", "80%", "60%"] }}
      transition={{ repeat: Infinity, duration: 2 }}
    />
    <motion.div
      className="w-full h-2 bg-primary/40 rounded"
      animate={{ width: ["70%", "90%", "50%"] }}
      transition={{ repeat: Infinity, duration: 2.5, delay: 0.2 }}
    />
    <motion.div
      className="w-full h-2 bg-primary/40 rounded"
      animate={{ width: ["80%", "40%", "70%"] }}
      transition={{ repeat: Infinity, duration: 1.8, delay: 0.4 }}
    />
    {/* Scanning Line */}
    <motion.div
      className="absolute top-0 left-0 w-full h-1 bg-blue-400 shadow-[0_0_15px_#60a5fa]"
      animate={{ top: ["0%", "100%", "0%"] }}
      transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
    />
  </div>
);

// --- STAGE 2: VISION (Eye Scanning Image) ---
const VisionAnim = () => (
  <div className="relative flex items-center justify-center">
    <div className="relative z-10 bg-black/20 p-6 rounded-full border border-purple-500/30 backdrop-blur-sm">
      <Eye className="w-16 h-16 text-purple-400" />
    </div>
    {/* Radar Rings */}
    <motion.div
      className="absolute w-full h-full border border-purple-500/50 rounded-full"
      animate={{ scale: [1, 2], opacity: [1, 0] }}
      transition={{ repeat: Infinity, duration: 1.5 }}
    />
    <motion.div
      className="absolute w-full h-full border border-purple-500/50 rounded-full"
      animate={{ scale: [1, 2], opacity: [1, 0] }}
      transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
    />
    {/* Grid Overlay */}
    <div className="absolute inset-[-50px] border border-dashed border-purple-500/10 grid grid-cols-4 grid-rows-4 rounded-full opacity-50 animate-spin-slow" />
  </div>
);

// --- STAGE 3: INDEXING (Data Flow to Database) ---
const IndexingAnim = () => (
  <div className="flex items-center gap-8">
    <div className="flex flex-col gap-2">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="w-3 h-3 bg-green-400 rounded-full"
          animate={{ x: [0, 100], opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
        />
      ))}
    </div>
    <div className="relative">
      <Database className="w-20 h-20 text-green-500" />
      <motion.div
        className="absolute -bottom-2 -right-2 bg-background rounded-full p-1 border border-green-500"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
      >
        <ScanLine className="w-6 h-6 text-green-400" />
      </motion.div>
    </div>
  </div>
);

// --- STAGE 4: GRAPH (Nodes Connecting) ---
const GraphAnim = () => (
  <div className="relative w-48 h-48">
    <motion.div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
    >
      <Network className="w-24 h-24 text-orange-500" />
    </motion.div>
    {/* Orbiting Nodes */}
    {[0, 120, 240].map((deg, i) => (
      <motion.div
        key={i}
        className="absolute top-1/2 left-1/2 w-4 h-4 bg-orange-400 rounded-full shadow-[0_0_10px_orange]"
        style={{ marginLeft: -8, marginTop: -8 }}
        animate={{
          x: [
            Math.cos((deg * Math.PI) / 180) * 60,
            Math.cos(((deg + 360) * Math.PI) / 180) * 60,
          ],
          y: [
            Math.sin((deg * Math.PI) / 180) * 60,
            Math.sin(((deg + 360) * Math.PI) / 180) * 60,
          ],
        }}
        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
      />
    ))}
  </div>
);

const PipelineStep = ({ label, active, completed, icon: Icon }: any) => (
  <div
    className={`flex flex-col items-center gap-2 transition-all duration-500 ${
      active ? "scale-110 opacity-100" : "opacity-50"
    } ${completed ? "text-primary opacity-80" : ""}`}
  >
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
        active
          ? "border-primary bg-primary/20 text-primary shadow-[0_0_20px_rgba(59,130,246,0.5)]"
          : completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted text-muted-foreground"
      }`}
    >
      {completed ? (
        <CheckCircle2 className="w-5 h-5" />
      ) : (
        <Icon className="w-5 h-5" />
      )}
    </div>
    <span className="text-[10px] font-medium uppercase tracking-wider">
      {label}
    </span>
  </div>
);

export const ProcessingView: React.FC<ProcessingViewProps> = ({ status }) => {
  const { stage, step, progress } = status;

  const renderAnim = () => {
    switch (stage) {
      case "parsing":
        return <ParsingAnim />;
      case "vision":
        return <VisionAnim />;
      case "indexing":
        return <IndexingAnim />;
      case "graph":
        return <GraphAnim />;
      default:
        return (
          <BrainCircuit className="w-20 h-20 text-muted-foreground animate-pulse" />
        );
    }
  };

  const getStageIndex = () => {
    const order = ["parsing", "vision", "indexing", "graph", "done"];
    return order.indexOf(stage);
  };

  const currentIdx = getStageIndex();

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 p-10 relative overflow-hidden">
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Main Animation Container */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-2xl">
        {/* Hero Animation */}
        <div className="h-64 w-64 flex items-center justify-center mb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={stage}
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {renderAnim()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Status Text */}
        <div className="text-center mb-12 space-y-2">
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent animate-gradient">
            {stage === "parsing"
              ? "Deconstructing File"
              : stage === "vision"
                ? "Visual Intelligence"
                : stage === "indexing"
                  ? "Vectorization"
                  : stage === "graph"
                    ? "Knowledge Mapping"
                    : "Processing"}
          </h2>

          {/* Enhanced Step Text for Granular Updates */}
          <p className="text-muted-foreground font-mono text-sm min-h-[1.5rem] transition-all">
            {step}
          </p>
        </div>

        {/* Pipeline Steps */}
        <div className="w-full flex justify-between items-center relative mb-8">
          {/* Connecting Line */}
          <div className="absolute top-5 left-0 w-full h-0.5 bg-muted -z-10">
            <motion.div
              className="h-full bg-primary"
              animate={{ width: `${(currentIdx / 3) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <PipelineStep
            label="Layout"
            icon={FileText}
            active={stage === "parsing"}
            completed={currentIdx > 0}
          />
          <PipelineStep
            label="Vision"
            icon={Eye}
            active={stage === "vision"}
            completed={currentIdx > 1}
          />
          <PipelineStep
            label="Vectors"
            icon={Database}
            active={stage === "indexing"}
            completed={currentIdx > 2}
          />
          <PipelineStep
            label="Graph"
            icon={Network}
            active={stage === "graph"}
            completed={currentIdx > 3}
          />
        </div>

        {/* Global Progress Bar */}
        <div className="w-full space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Overall Progress</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>
    </div>
  );
};
