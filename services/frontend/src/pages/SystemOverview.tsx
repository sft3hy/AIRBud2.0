import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  Layers,
  Database,
  Cpu,
  Code,
  Server,
  Search,
  Box,
  Network,
  Share2,
  Workflow,
  Zap,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import doggieSrc from "../assets/doggie.svg";
import { ClassificationBanner } from "../components/ClassificationBanner";

// Sleek external link component
const ExtLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary font-medium hover:text-primary/80 hover:underline underline-offset-4 decoration-primary/30 transition-all"
  >
    {children}
  </a>
);

export const SystemOverview = () => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-transparent font-sans selection:bg-primary/20">
      {/* Top Banner */}
      <div className="flex-shrink-0 z-50">
        <ClassificationBanner />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto relative scroll-smooth">
        {/* Local Background Removed - Using Global App Background */}
        {/* Sticky Header */}
        <div className="sticky top-0 left-0 right-0 z-40 px-6 md:px-12 py-4 bg-background/10 backdrop-blur-sm border-b border-border/40 flex items-center justify-between mb-8 transition-all">
          <Link to="/">
            <Button
              variant="ghost"
              className="gap-2 pl-0 hover:bg-transparent hover:text-primary transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-semibold">Back to Dashboard</span>
            </Button>
          </Link>
          <div className="hidden md:flex items-center gap-2 opacity-50">
            <Activity className="h-4 w-4" />
            <span className="text-xs uppercase tracking-widest">
              System Health: Nominal
            </span>
          </div>
        </div>
        <div className="mx-auto space-y-8 max-w-4xl">
          <div className="relative z-10 min-h-full p-6 md:p-12 animate-in fade-in duration-700 slide-in-from-bottom-4">
            <div className="mx-auto space-y-12">
              {/* Header Section */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/40">
                <div className="space-y-4">
                  <h1 className="flex items-center gap-4 text-4xl font-extrabold tracking-tight lg:text-5xl">
                    <div className="relative">
                      <img
                        src={doggieSrc}
                        alt="AIRBud"
                        className="h-14 w-14 drop-shadow-md hover:scale-110 transition-transform"
                      />
                      <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full -z-10"></div>
                    </div>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/50">
                      System Overview
                    </span>
                  </h1>
                  <p className="text-xl text-muted-foreground max-w-2xl">
                    A technical deep dive into the hybrid retrieval strategies
                    and computer vision powering AIRBud 2.0.
                  </p>
                </div>
                <div className="hidden md:block">
                  <Badge
                    variant="outline"
                    className="px-4 py-1.5 text-sm font-medium uppercase tracking-widest text-muted-foreground bg-background/50 backdrop-blur-md"
                  >
                    v2.0.4-stable
                  </Badge>
                </div>
              </div>

              {/* Section 1: The Core Concept */}
              <section className="grid md:grid-cols-3 gap-8 items-center">
                <div className="md:col-span-2 space-y-5">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <Zap className="h-5 w-5 text-yellow-500 fill-yellow-500/20" />
                    </div>
                    The RAG Paradigm
                  </h2>
                  <p className="leading-relaxed text-lg text-muted-foreground">
                    <strong>Retrieval-Augmented Generation (RAG)</strong>{" "}
                    bridges the gap between a static Large Language Model (LLM)
                    and your private data. Instead of relying on the model's
                    training data, we mathematically retrieve relevant snippets
                    from your vector index and feed them to the model as context
                    at runtime.
                  </p>
                </div>
                <Card className="bg-muted/30 border-dashed backdrop-blur-sm">
                  <CardContent className="p-6 text-sm text-muted-foreground italic font-medium leading-relaxed">
                    "We don't just ask the AI what it knows. We show it the
                    facts, then ask it to synthesize."
                  </CardContent>
                </Card>
              </section>

              <Separator className="bg-border/60" />

              {/* Section 2: Architectural Improvements */}
              <section className="space-y-8">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Architectural Pillars</h2>
                  <p className="text-muted-foreground">
                    Four key innovations that separate AIRBud from standard RAG
                    implementations.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* GraphRAG */}
                  <Card className="bg-card/40 backdrop-blur-md group hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl">
                    <CardHeader className="flex flex-row items-center gap-4 pb-3">
                      <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                        <Network className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-lg">
                        GraphRAG & Knowledge
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed space-y-3">
                      <p>
                        Vector search handles similarity, but fails at
                        structure. We utilize{" "}
                        <ExtLink href="https://neo4j.com/">Neo4j</ExtLink> to
                        construct a <strong>Knowledge Graph</strong>.
                      </p>
                      <p className="text-sm border-t border-border/50 pt-2">
                        By extracting entities and relationships, we enable
                        "multi-hop" reasoning—connecting disparately worded
                        facts that refer to the same entity across documents.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Vision */}
                  <Card className="bg-card/40 backdrop-blur-md group hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl">
                    <CardHeader className="flex flex-row items-center gap-4 pb-3">
                      <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                        <Eye className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-lg">Computer Vision</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed space-y-3">
                      <p>
                        We use{" "}
                        <ExtLink href="https://github.com/facebookresearch/detectron2">
                          Detectron2
                        </ExtLink>{" "}
                        for layout analysis, identifying bounding boxes around
                        figures and charts.
                      </p>
                      <p className="text-sm border-t border-border/50 pt-2">
                        These regions are cropped and processed by Multimodal
                        LLMs (e.g., <strong>Moondream2</strong>), converting
                        visual data into semantic text descriptions for the
                        search engine.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Chunking */}
                  <Card className="bg-card/40 backdrop-blur-md group hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl">
                    <CardHeader className="flex flex-row items-center gap-4 pb-3">
                      <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                        <Layers className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-lg">
                        Parent-Child Chunking
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed space-y-3">
                      <p>
                        We decouple the <em>searchable</em> unit from the{" "}
                        <em>retrievable</em> unit using a{" "}
                        <ExtLink href="https://medium.com/@seahorse.technologies.sl/parent-child-chunking-in-langchain-for-advanced-rag-e7c37171995a">
                          Parent-Child strategy
                        </ExtLink>
                        .
                      </p>
                      <p className="text-sm border-t border-border/50 pt-2">
                        We index granular "Child" chunks for high-precision
                        matching, but deliver the larger "Parent" chunk to the
                        LLM. This ensures the model receives full context, not
                        fragmented sentences.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Microservices */}
                  <Card className="bg-card/40 backdrop-blur-md group hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl">
                    <CardHeader className="flex flex-row items-center gap-4 pb-3">
                      <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                        <Cpu className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-lg">
                        Microservice Grid
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed space-y-3">
                      <p>
                        Orchestrated via{" "}
                        <ExtLink href="https://www.docker.com/">Docker</ExtLink>
                        , the system is modular:
                      </p>
                      <ul className="grid grid-cols-2 gap-2 text-sm border-t border-border/50 pt-2">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />{" "}
                          KG Service
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />{" "}
                          Vision GPU
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />{" "}
                          Core API
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />{" "}
                          Parser
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Section 3: The Tech Stack */}
              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Technology Stack</h2>
                  <div className="h-px flex-1 bg-border/60 ml-6" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      name: "Neo4j",
                      role: "Graph Database",
                      icon: Share2,
                      url: "https://neo4j.com/",
                      color: "text-indigo-500",
                    },
                    {
                      name: "Detectron2",
                      role: "Layout Analysis",
                      icon: Box,
                      url: "https://github.com/facebookresearch/detectron2",
                      color: "text-blue-500",
                    },
                    {
                      name: "FAISS",
                      role: "Vector Index",
                      icon: Search,
                      url: "https://github.com/facebookresearch/faiss",
                      color: "text-cyan-500",
                    },
                    {
                      name: "PostgreSQL",
                      role: "Relational DB",
                      icon: Database,
                      url: "https://www.postgresql.org/",
                      color: "text-sky-600",
                    },
                    {
                      name: "FastAPI",
                      role: "Backend API",
                      icon: Server,
                      url: "https://fastapi.tiangolo.com/",
                      color: "text-teal-500",
                    },
                    {
                      name: "React + Vite",
                      role: "Frontend",
                      icon: Code,
                      url: "https://react.dev/",
                      color: "text-violet-500",
                    },
                    {
                      name: "LangChain",
                      role: "Orchestration",
                      icon: Workflow,
                      url: "https://www.langchain.com/",
                      color: "text-emerald-500",
                    },
                    {
                      name: "Docker",
                      role: "Containerization",
                      icon: Box,
                      url: "https://www.docker.com/",
                      color: "text-blue-400",
                    },
                  ].map((tech) => (
                    <a
                      key={tech.name}
                      href={tech.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-xl border bg-card/40 backdrop-blur-md hover:bg-muted/50 hover:border-primary/40 transition-all duration-200 group"
                    >
                      <tech.icon
                        className={`h-5 w-5 ${tech.color} group-hover:scale-110 transition-transform`}
                      />
                      <div>
                        <div className="font-semibold text-sm group-hover:text-foreground/90">
                          {tech.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {tech.role}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>

              {/* Section 4: The Data Pipeline */}
              <section className="space-y-8 pb-12">
                <h2 className="text-2xl font-bold">The Hybrid Pipeline</h2>

                <div className="relative border rounded-2xl p-8 bg-gradient-to-br from-card/60 to-background/60 backdrop-blur-xl overflow-hidden shadow-2xl">
                  {/* Background Decorator */}
                  <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl animate-pulse" />

                  <div className="relative z-10 space-y-12">
                    {[
                      {
                        id: 1,
                        title: "Ingestion & Analysis",
                        desc: "Files are processed in parallel. Detectron2 handles visuals while LLMs extract entities (Nodes) and relationships (Edges).",
                      },
                      {
                        id: 2,
                        title: "Dual Indexing",
                        desc: "Text is chunked into FAISS for semantic search. Extracted triples are written to Neo4j to build the knowledge graph.",
                      },
                      {
                        id: 3,
                        title: "Hybrid Retrieval",
                        desc: "User queries trigger simultaneous lookups: Vector similarity (FAISS) + Graph traversal (Neo4j).",
                      },
                      {
                        id: 4,
                        title: "Synthesis",
                        desc: "The LLM receives a composite context window of text, chart descriptions, and graph connections to formulate the final answer.",
                      },
                    ].map((step, idx, arr) => (
                      <div
                        key={step.id}
                        className="relative flex gap-6 md:gap-10 group"
                      >
                        {/* Connector Line */}
                        {idx !== arr.length - 1 && (
                          <div className="absolute left-[1.2rem] top-12 bottom-[-3rem] w-0.5 bg-gradient-to-b from-border via-primary/50 to-transparent md:left-[1.2rem]" />
                        )}

                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold shadow-[0_0_15px_rgba(59,130,246,0.2)] group-hover:scale-110 transition-transform bg-background z-20 relative">
                            {step.id}
                          </div>
                        </div>

                        <div className="space-y-2 pt-1">
                          <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                            {step.title}
                          </h3>
                          <p className="text-muted-foreground text-sm leading-relaxed max-w-3xl">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Banner */}
      <div className="flex-shrink-0 z-50">
        <ClassificationBanner />
      </div>
    </div>
  );
};
