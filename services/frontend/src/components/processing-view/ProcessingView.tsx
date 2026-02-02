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
  ArrowRight,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

import { JobStatus } from "../../types";

interface ProcessingViewProps {
  status: JobStatus;
  onComplete?: () => void;
  canMinimize?: boolean;
  onMinimize?: () => void;
}

const variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.3 } },
};

// --- STAGE ANIMATIONS (Unchanged) ---
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
    <motion.div
      className="absolute top-0 left-0 w-full h-1 bg-blue-400 shadow-[0_0_15px_#60a5fa]"
      animate={{ top: ["0%", "100%", "0%"] }}
      transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
    />
  </div>
);

const VisionAnim = () => (
  <div className="relative flex items-center justify-center">
    <div className="relative z-10 bg-black/20 p-6 rounded-full border border-purple-500/30 backdrop-blur-sm">
      <Eye className="w-16 h-16 text-purple-400" />
    </div>
    <motion.div
      className="absolute w-full h-full border border-purple-500/50 rounded-full"
      animate={{ scale: [1, 2], opacity: [1, 0] }}
      transition={{ repeat: Infinity, duration: 1.5 }}
    />
    <div className="absolute inset-[-50px] border border-dashed border-purple-500/10 grid grid-cols-4 grid-rows-4 rounded-full opacity-50 animate-spin-slow" />
  </div>
);

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
        className="absolute -bottom-2 -right-2 bg-background/80 rounded-full p-1 border border-green-500"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
      >
        <ScanLine className="w-6 h-6 text-green-400" />
      </motion.div>
    </div>
  </div>
);

const GraphAnim = () => (
  <div className="relative w-48 h-48">
    <motion.div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
    >
      <Network className="w-24 h-24 text-orange-500" />
    </motion.div>
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

const SuccessAnim = () => (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: "spring", stiffness: 200, damping: 10 }}
    className="flex flex-col items-center justify-center"
  >
    <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center border-4 border-green-500 mb-6 shadow-[0_0_40px_rgba(34,197,94,0.4)]">
      <CheckCircle2 className="w-12 h-12 text-green-500" />
    </div>
    <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
      Complete!
    </h3>
  </motion.div>
);

const PipelineStep = ({ label, active, completed, icon: Icon }: any) => (
  <div
    className={`flex flex-col items-center gap-2 transition-all duration-500 relative z-10 ${active ? "scale-110 opacity-100" : "opacity-50"
      } ${completed ? "text-primary opacity-80" : ""}`}
  >
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors bg-background/80 ${active
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
    <span className="text-[10px] font-medium uppercase tracking-wider bg-background/80 px-1 rounded">
      {label}
    </span>
  </div>
);

export const ProcessingView: React.FC<ProcessingViewProps> = ({
  status,
  onComplete,
  canMinimize,
  onMinimize,
}) => {
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
      case "done":
        return <SuccessAnim />;
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
  const isDone = stage === "done" || progress === 100;

  // --- FIX 1: Clamp width to 100% ---
  const barWidth = Math.min((currentIdx / 3) * 100, 100);

  return (
    <div className="h-full overflow-y-auto bg-transparent relative custom-scrollbar">
      {/* Background Decorator Removed to transparently show app background */}

      <div className="relative z-10 flex flex-col items-center justify-center min-h-full py-8 w-full">
        <div className="flex flex-col items-center w-full max-w-2xl px-4">
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
          <div className="text-center mb-12 space-y-2 h-20">
            {isDone ? (
              // --- FIX 2: Manual Navigation Button ---
              <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <p className="text-muted-foreground">Document ready for chat.</p>
                <Button
                  onClick={onComplete}
                  size="lg"
                  className="gap-2 shadow-lg"
                >
                  Continue to Chat <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                {/* Filename Display */}
                {status.details?.current_file && (
                  <div className="mb-2 animate-in fade-in slide-in-from-top-2">
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-muted-foreground font-mono">
                      {status.details.current_file}
                    </span>
                  </div>
                )}

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
                <p className="text-muted-foreground font-mono text-sm min-h-[1.5rem] transition-all">
                  {step}
                </p>
              </>
            )}
          </div>

          {/* Pipeline Steps */}
          <div className="w-full flex justify-between items-center relative mb-12 mt-4">
            {/* Connecting Line */}
            <div className="absolute top-5 left-0 w-full h-0.5 bg-muted/30 -z-10">
              <motion.div
                className="h-full bg-primary"
                animate={{ width: `${barWidth}%` }}
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

          {/* MINIMIZE BUTTON (Moved Here) */}
          {!isDone && canMinimize && (
            <div className="w-full flex flex-col items-center justify-center mb-8 animate-in fade-in zoom-in duration-500">
              <Button
                variant="outline"
                className="bg-background/20 backdrop-blur border-white/10 hover:bg-white/10 gap-2 transition-all hover:scale-105"
                onClick={onMinimize}
              >
                <ArrowRight className="w-4 h-4" />
                Chat with Collection
              </Button>
              <p className="text-[10px] text-muted-foreground mt-2 text-center opacity-70">
                Processing will continue in background
              </p>
            </div>
          )}

          {/* Global Progress Bar */}
          <div className="w-full space-y-2 opacity-80">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Overall Progress</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-muted/30" />
          </div>

          {/* Live Terminal */}
          <div className="w-full mt-8 bg-black/90 rounded-md border border-white/10 p-5 font-mono text-xs text-green-400/80 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] relative overflow-hidden">
            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] opacity-20" />

            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-3 opacity-70 text-sm font-bold tracking-wider">
              <span>IMAGE_PROCESSING_UNIT</span>
              <span>PID: {Math.floor(Math.random() * 9000) + 1000}</span>
            </div>

            <div className="h-48 overflow-y-auto space-y-1.5 flex flex-col font-mono text-xs leading-relaxed
                [&::-webkit-scrollbar]:w-2
                [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:bg-green-500/20
                [&::-webkit-scrollbar-thumb]:rounded-full
                [&::-webkit-scrollbar-thumb]:border-none
                hover:[&::-webkit-scrollbar-thumb]:bg-green-400/40">
              {/* Show logs in reverse order (newest at bottom visually, but flex-col-reverse puts first item at bottom) 
                   Actually standard terminal is top-down. Let's use standard with auto-scroll. 
               */}
              <div className="flex flex-col gap-1.5 ">
                {status.details?.logs?.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="break-all"
                  >
                    <span className="text-blue-500 mr-2 font-bold">{">"}</span>
                    {log}
                  </motion.div>
                ))}
                {/* Typing cursor */}
                <motion.div
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="w-2 h-4 bg-green-500/50 mt-1"
                />
              </div>
            </div>
          </div>

          {/* QUEUE DISPLAY */}
          <QueueDisplay />
        </div>
      </div>
    </div>
  );
};

import { QueueDisplay } from "../queue-display/QueueDisplay";
