import React from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    Eye,
    Layers,
    Database,
    Cpu,
    FileText,
    Code,
    Server,
    Search,
    Box,
    Network,
    Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Helper for consistent external links
const ExtLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 font-medium hover:underline decoration-blue-600/30 underline-offset-2 transition-colors"
    >
        {children}
    </a>
);

export const SystemOverview = () => {
    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-12">
            <div className="max-w-5xl mx-auto space-y-16">

                {/* Header & Back Button */}
                <div className="space-y-6 border-b pb-8">
                    <Link to="/">
                        <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-primary">
                            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-2">
                            AIRBud 2.0 System Overview
                        </h1>
                        <p className="text-xl text-muted-foreground">
                            A deep dive into the architecture, computer vision, and hybrid retrieval strategies powering this application.
                        </p>
                    </div>
                </div>

                {/* Section 1: The Core Concept */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">1. The RAG Paradigm</h2>
                    <p className="leading-relaxed text-lg text-muted-foreground">
                        <strong>Retrieval-Augmented Generation (RAG)</strong> bridges the gap between a static Large Language Model (LLM) and your private data. Instead of hoping the model "knows" your data, we mathematically retrieve relevant snippets and feed them to the model as context.
                    </p>
                </section>

                {/* Section 2: Architectural Improvements */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold">2. Architectural Improvements</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <Card className="bg-card/50">
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                    <Network className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-lg">GraphRAG & Knowledge Graphs</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-2">
                                <p>
                                    Vector search is great for similarity, but bad at structure. We use <ExtLink href="https://neo4j.com/">Neo4j</ExtLink> to build a <strong>Knowledge Graph</strong>.
                                </p>
                                <p>
                                    An LLM extracts entities (People, Companies, Concepts) and their relationships from your docs. This allows us to perform "multi-hop" reasoning—connecting facts across different documents that might use different wording but refer to the same entity.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card/50">
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Eye className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-lg">Layout Analysis & Vision</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-2">
                                <p>
                                    Standard RAG blindly extracts text, losing the meaning of charts. We use <ExtLink href="https://github.com/facebookresearch/detectron2">Detectron2</ExtLink> to draw bounding boxes around figures and tables.
                                </p>
                                <p>
                                    We then crop these images and feed them to Multimodal LLMs like <ExtLink href="https://huggingface.co/vikhyatk/moondream2">Moondream2</ExtLink> or <strong>Qwen-VL</strong> to generate detailed text descriptions, making your charts "readable" to the search engine.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card/50">
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                                    <Layers className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-lg">Parent-Child Chunking</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-2">
                                <p>
                                    Splitting text into arbitrary fragments destroys context. We use a <ExtLink href="https://medium.com/@seahorse.technologies.sl/parent-child-chunking-in-langchain-for-advanced-rag-e7c37171995a">Parent-Child strategy</ExtLink>.
                                </p>
                                <p>
                                    We index small "Child" chunks for high-precision search, but we return the larger "Parent" chunk (rich context) to the LLM. This ensures the model gets full paragraphs or pages of context, not just half-sentences.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card/50">
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                    <Cpu className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-lg">Microservice Architecture</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-2">
                                <p>
                                    The application is split into specialized <ExtLink href="https://www.docker.com/">Docker</ExtLink> containers:
                                </p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li><strong>KG Service:</strong> Graph extraction & <ExtLink href="https://neo4j.com/">Neo4j</ExtLink>.</li>
                                    <li><strong>Vision:</strong> GPU-accelerated inference.</li>
                                    <li><strong>Core:</strong> Orchestration & Vector Search.</li>
                                    <li><strong>Parser:</strong> PDF/Docx processing.</li>
                                </ul>
                            </CardContent>
                        </Card>

                    </div>
                </section>

                {/* Section 3: The Tech Stack */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold">3. Under the Hood: Technology Stack</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { name: "Neo4j", role: "Graph Database", icon: Share2, url: "https://neo4j.com/" },
                            { name: "Detectron2", role: "Layout Analysis", icon: Box, url: "https://github.com/facebookresearch/detectron2" },
                            { name: "FAISS", role: "Vector Index", icon: Search, url: "https://github.com/facebookresearch/faiss" },
                            { name: "PostgreSQL", role: "Relational DB", icon: Database, url: "https://www.postgresql.org/" },
                            { name: "FastAPI", role: "Backend API", icon: Server, url: "https://fastapi.tiangolo.com/" },
                            { name: "React + Vite", role: "Frontend", icon: Code, url: "https://react.dev/" },
                            { name: "LangChain", role: "Orchestration", icon: Layers, url: "https://www.langchain.com/" },
                            { name: "Docker", role: "Containerization", icon: Box, url: "https://www.docker.com/" },
                        ].map((tech) => (
                            <a
                                key={tech.name}
                                href={tech.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border hover:bg-muted/60 transition-colors hover:border-blue-300 group"
                            >
                                <tech.icon className="h-5 w-5 text-muted-foreground group-hover:text-blue-500" />
                                <div>
                                    <div className="font-semibold text-sm group-hover:text-blue-600">{tech.name}</div>
                                    <div className="text-xs text-muted-foreground">{tech.role}</div>
                                </div>
                            </a>
                        ))}
                    </div>
                </section>

                {/* Section 4: The Data Pipeline */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold">4. The Hybrid Pipeline</h2>
                    <div className="bg-card border rounded-xl p-6 md:p-8 space-y-8 relative overflow-hidden">

                        {/* Step 1 */}
                        <div className="relative z-10 flex gap-4 md:gap-8 items-start">
                            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 mt-1">1</div>
                            <div className="space-y-2">
                                <h3 className="font-bold text-lg">Ingestion & Analysis</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Files are uploaded. <ExtLink href="https://github.com/facebookresearch/detectron2">Detectron2</ExtLink> extracts charts, which are described by <strong>Vision Models</strong>. Simultaneously, an LLM scans the text to extract Entities (Nodes) and Relationships (Edges).
                                </p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative z-10 flex gap-4 md:gap-8 items-start">
                            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 mt-1">2</div>
                            <div className="space-y-2">
                                <h3 className="font-bold text-lg">Dual Indexing</h3>
                                <div className="text-muted-foreground text-sm leading-relaxed">
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li><strong>Vector Path:</strong> Text is chunked and embedded into <ExtLink href="https://github.com/facebookresearch/faiss">FAISS</ExtLink> for semantic search.</li>
                                        <li><strong>Graph Path:</strong> Extracted triples are written to <ExtLink href="https://neo4j.com/">Neo4j</ExtLink> to build a connected web of knowledge.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative z-10 flex gap-4 md:gap-8 items-start">
                            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 mt-1">3</div>
                            <div className="space-y-2">
                                <h3 className="font-bold text-lg">Hybrid Retrieval</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    When you ask a question, we query <strong>FAISS</strong> for relevant text chunks AND query <strong>Neo4j</strong> for related entities and their neighbors.
                                </p>
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className="relative z-10 flex gap-4 md:gap-8 items-start">
                            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 mt-1">4</div>
                            <div className="space-y-2">
                                <h3 className="font-bold text-lg">Synthesis</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    The LLM receives a rich context containing specific text excerpts, chart descriptions, and structural graph relationships to generate a comprehensive, fact-based answer.
                                </p>
                            </div>
                        </div>

                        {/* Decorator Line */}
                        <div className="absolute left-[2.85rem] md:left-[3.85rem] top-8 bottom-8 w-0.5 bg-border -z-0" />
                    </div>
                </section>

            </div>
        </div>
    );
};