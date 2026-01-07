import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, Layers, Database, Cpu, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const HowItWorks = () => {
    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-12">
            <div className="max-w-4xl mx-auto space-y-12">

                {/* Header & Back Button */}
                <div className="space-y-6">
                    <Link to="/">
                        <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-primary">
                            <ArrowLeft className="h-4 w-4" /> Back
                        </Button>
                    </Link>
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                        How Smart RAG Works
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Moving beyond naive implementation to a robust, vision-aware document intelligence system.
                    </p>
                </div>

                {/* Section 1: What is RAG? */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold border-b pb-2">1. What is RAG?</h2>
                    <p className="leading-relaxed">
                        <strong>Retrieval-Augmented Generation (RAG)</strong> is a technique that enhances Large Language Models (LLMs) by giving them access to your specific data. Instead of relying solely on what the AI learned during training, RAG retrieves relevant information from your documents and inserts it into the prompt, allowing the AI to answer questions about private data accurately.
                    </p>
                </section>

                {/* Section 2: Our Improvements */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold border-b pb-2">2. Our "Smart" Improvements</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <Card>
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Eye className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-lg">Vision-Aware Processing</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground leading-relaxed">
                                Standard RAG ignores images. We use dedicated Vision Models (like <strong>Moondream2</strong> or <strong>Qwen-VL</strong>) to "look" at every chart, graph, and diagram in your PDF. We generate textual descriptions of these visuals so the LLM can "read" your charts just like text.
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                                    <Layers className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-lg">Parent-Child Chunking</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground leading-relaxed">
                                Naive RAG splits text into arbitrary small pieces, often losing context. We use a <strong>Parent-Child strategy</strong>: we search using small, precise "child" chunks, but we feed the "parent" (larger surrounding context) to the LLM. This ensures the answer is comprehensive.
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                    <Database className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-lg">Hybrid Search (Vector + DB)</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground leading-relaxed">
                                We maintain a structured SQL database alongside our FAISS vector store. This allows us to track metadata, manage sessions, and persist chart descriptions separately from raw embeddings, providing a robust history and retrieval system.
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                    <Cpu className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-lg">Microservice Architecture</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground leading-relaxed">
                                The app is split into specialized services: <strong>Parser</strong> (Layout Analysis), <strong>Vision</strong> (GPU-accelerated Inference), and <strong>Core</strong> (Orchestration). This ensures heavy AI jobs don't block the chat interface.
                            </CardContent>
                        </Card>

                    </div>
                </section>

                {/* Section 3: The Pipeline */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold border-b pb-2">3. The Pipeline Flow</h2>
                    <div className="bg-muted/30 p-6 rounded-xl border space-y-4 font-mono text-sm">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span>1. Document Upload &rarr; Sent to Parser Service</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-primary" />
                            <span>2. Images Extracted &rarr; Vision Model generates descriptions</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-primary" />
                            <span>3. Text + Image Descriptions &rarr; Chunked & Embedded into FAISS</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-primary" />
                            <span>4. User Query &rarr; Retrieved Context &rarr; LLM Answer</span>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
};