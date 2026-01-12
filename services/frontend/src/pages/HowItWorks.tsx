import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, Layers, Database, Cpu, FileText, Code, Server, Search, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

export const HowItWorks = () => {
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
                            How Smart RAG Works
                        </h1>
                        <p className="text-xl text-muted-foreground">
                            A deep dive into the architecture, computer vision, and retrieval strategies powering this application.
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
                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Eye className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-lg">Layout Analysis & Vision</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-2">
                                <p>
                                    Standard RAG blindly extracts text, losing the meaning of charts. We use <ExtLink href="https://github.com/facebookresearch/detectron2">Detectron2</ExtLink> (a Facebook AI Research library) with a ResNet50 backbone trained on the <ExtLink href="https://github.com/ibm-aur-nlp/PubLayNet">PubLayNet</ExtLink> dataset.
                                </p>
                                <p>
                                    This allows us to draw bounding boxes around figures and tables. We then crop these images and feed them to Multimodal LLMs like <ExtLink href="https://huggingface.co/vikhyatk/moondream2">Moondream2</ExtLink> or <ExtLink href="https://ollama.com/library/gemma3">Gemma 3</ExtLink> to generate detailed text descriptions, making your charts "readable" to the search engine.
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
                                    Splitting text into arbitrary 500-character chunks often destroys context. We use a <ExtLink href="https://medium.com/@seahorse.technologies.sl/parent-child-chunking-in-langchain-for-advanced-rag-e7c37171995a">Parent-Child strategy</ExtLink> via <ExtLink href="https://www.langchain.com/">LangChain</ExtLink>.
                                </p>
                                <p>
                                    We index small "Child" chunks (high specificity) for the search algorithm, but we return the larger "Parent" chunk (rich context) to the LLM. This ensures the model gets full paragraphs or pages of context, not just fragments.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card/50">
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                    <Database className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-lg">Hybrid Storage (SQL + Vector)</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-2">
                                <p>
                                    We don't rely solely on a vector store. We use <ExtLink href="https://www.postgresql.org/">PostgreSQL</ExtLink> to manage Collection metadata, file paths, and chat history relationally.
                                </p>
                                <p>
                                    Alongside this, we use <ExtLink href="https://github.com/facebookresearch/faiss">FAISS</ExtLink> (Facebook AI Similarity Search) for high-performance dense vector clustering. This hybrid approach allows for robust data management (renaming, deleting) that pure vector DBs often struggle with.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card/50">
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                    <Cpu className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-lg">Containerized Microservices</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-2">
                                <p>
                                    The application is split into <ExtLink href="https://www.docker.com/">Docker</ExtLink> containers for scalability:
                                </p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li><strong>Parser:</strong> CPU-optimized <ExtLink href="https://pytorch.org/">PyTorch</ExtLink> & Detectron2.</li>
                                    <li><strong>Vision:</strong> GPU-accelerated inference service.</li>
                                    <li><strong>Core:</strong> FastAPI orchestration & Logic.</li>
                                    <li><strong>Frontend:</strong> <ExtLink href="https://react.com/">React</ExtLink> /<ExtLink href="https://vite.dev/">Vite</ExtLink> UI.</li>
                                </ul>
                            </CardContent>
                        </Card>

                    </div>
                </section>

                {/* Section 3: The Tech Stack */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold">3. Under the Hood: Technology Stack</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                            { name: "Detectron2", role: "Layout Analysis", icon: Box, url: "https://github.com/facebookresearch/detectron2" },
                            { name: "FAISS", role: "Vector Index", icon: Search, url: "https://github.com/facebookresearch/faiss" },
                            { name: "PostgreSQL", role: "Metadata DB", icon: Database, url: "https://www.postgresql.org/" },
                            { name: "FastAPI", role: "Backend API", icon: Server, url: "https://fastapi.tiangolo.com/" },
                            { name: "React + Vite", role: "Frontend", icon: Code, url: "https://react.dev/" },
                            { name: "LangChain", role: "Orchestration", icon: Layers, url: "https://www.langchain.com/" },
                            { name: "all-MiniLM-L6-v2", role: "Embeddings", icon: FileText, url: "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2" },
                            { name: "Docker", role: "Containerization", icon: Box, url: "https://www.docker.com/" },
                            { name: "Ollama", role: "Local Inference", icon: Cpu, url: "https://ollama.com/" },
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
                    <h2 className="text-2xl font-bold">4. The Processing Pipeline</h2>
                    <div className="bg-card border rounded-xl p-6 md:p-8 space-y-8 relative overflow-hidden">

                        {/* Step 1 */}
                        <div className="relative z-10 flex gap-4 md:gap-8 items-start">
                            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 mt-1">1</div>
                            <div className="space-y-2">
                                <h3 className="font-bold text-lg">Ingestion & Layout Analysis</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Files (PDF/DOCX) are uploaded. The <strong>Parser Service</strong> uses <ExtLink href="https://github.com/pymupdf/PyMuPDF">PyMuPDF</ExtLink> to extract raw text and renders pages as images. <ExtLink href="https://github.com/facebookresearch/detectron2">Detectron2</ExtLink> scans these images to identify bounding boxes for charts, graphs, and tables.
                                </p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative z-10 flex gap-4 md:gap-8 items-start">
                            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 mt-1">2</div>
                            <div className="space-y-2">
                                <h3 className="font-bold text-lg">Vision Inference</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Cropped images of charts are sent to the <strong>Vision Service</strong>. A specialized model (like <ExtLink href="https://huggingface.co/vikhyatk/moondream2">Moondream2</ExtLink> or <ExtLink href="https://ollama.com/library/gemma3">Gemma 3</ExtLink>) generates a dense textual description of the visual data, including trends, labels, and numeric values.
                                </p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative z-10 flex gap-4 md:gap-8 items-start">
                            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 mt-1">3</div>
                            <div className="space-y-2">
                                <h3 className="font-bold text-lg">Embedding & Indexing</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    The original text and the new image descriptions are combined. <ExtLink href="https://www.langchain.com/">LangChain</ExtLink> splits this content into <ExtLink href="https://medium.com/@seahorse.technologies.sl/parent-child-chunking-in-langchain-for-advanced-rag-e7c37171995a">Parent/Child chunks</ExtLink>. The Child chunks are converted into 384-dimensional vectors using <ExtLink href="https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2">all-MiniLM-L6-v2</ExtLink> and stored in a local <ExtLink href="https://github.com/facebookresearch/faiss">FAISS</ExtLink> index unique to the document. Metadata is committed to <ExtLink href="https://www.postgresql.org/">PostgreSQL</ExtLink>.
                                </p>
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className="relative z-10 flex gap-4 md:gap-8 items-start">
                            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 mt-1">4</div>
                            <div className="space-y-2">
                                <h3 className="font-bold text-lg">Retrieval & Generation</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    When you ask a question, we convert it to a vector. We query <strong>FAISS</strong> for the nearest Child chunks, map them back to their Parent chunks, and feed that rich context into the LLM (via <ExtLink href="https://ollama.com/">Ollama</ExtLink> or Groq) to generate the final answer.
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