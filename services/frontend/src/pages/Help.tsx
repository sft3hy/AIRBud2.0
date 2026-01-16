import React from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    BookOpen,
    Users,
    ShieldCheck,
    Trash2,
    Search,
    AlertTriangle,
    FileText,
    MessageSquare,
    Lightbulb,
    LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';

export const Help = () => {
    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-12">
            <div className="max-w-4xl mx-auto space-y-12">

                {/* Header & Back Button */}
                <div className="space-y-6 border-b pb-8">
                    <Link to="/">
                        <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-primary">
                            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
                            User Guide & Help
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed">
                            Welcome to Automated Information Retriever Buddy (AIRBud) 2.0. This guide will help you understand how to organize your documents, work with teams, and get the most accurate answers from the AI.
                        </p>
                    </div>
                </div>

                {/* Section 1: Core Concepts */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <BookOpen className="h-6 w-6 text-primary" /> Core Concepts
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-blue-500" /> Collections
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground leading-relaxed">
                                <p className="mb-3">
                                    Think of a <strong>Collection</strong> as a project folder or a binder on your desk. It is a container for specific documents (PDFs, Word docs, PowerPoints) that relate to a single topic.
                                </p>
                                <p>
                                    When you chat with a Collection, the AI <strong>only</strong> reads the documents inside that specific folder. It does not look at your other collections. This ensures answers are relevant and focused.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-purple-500" /> Groups
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground leading-relaxed">
                                <p className="mb-3">
                                    A <strong>Group</strong> is a team workspace. Groups allow you to share Collections with other people.
                                </p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li><strong>Personal Group:</strong> You start with a default Personal space. Collections here are private to you.</li>
                                    <li><strong>Shared Groups:</strong> Collections created here are visible to everyone in the group.</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <Separator />

                {/* Section 2: Permissions & Logic */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <ShieldCheck className="h-6 w-6 text-green-600" /> Permissions & Rules
                    </h2>
                    <p className="text-muted-foreground">Understanding who can do what is key to keeping your data organized and secure.</p>

                    <Accordion type="single" collapsible className="w-full">
                        
                        <AccordionItem value="item-1">
                            <AccordionTrigger>Who can delete a Collection?</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground leading-relaxed">
                                <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                                    <Trash2 className="h-5 w-5 text-red-500 shrink-0 mt-1" />
                                    <div>
                                        <strong className="text-foreground block mb-1">The Golden Rule of Ownership</strong>
                                        You can only delete what you created.
                                        <ul className="list-disc pl-5 mt-2 space-y-1">
                                            <li>If you created the Collection, you see the Delete button.</li>
                                            <li>If a teammate created the Collection (even in a group you belong to), you <strong>cannot</strong> delete it. You can only view and chat with it.</li>
                                        </ul>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-2">
                            <AccordionTrigger>How do Public vs. Private Groups work?</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground leading-relaxed space-y-4">
                                <div>
                                    <strong className="text-foreground">Public Groups</strong>
                                    <p>These appear in the "Explore Public" tab. Anyone in the organization can see them and click <strong>Join</strong> to instantly become a member.</p>
                                </div>
                                <div>
                                    <strong className="text-foreground">Private Groups</strong>
                                    <p>These are hidden from the Explore tab. The only way to join is if a member sends you an <strong>Invite Link</strong> (found in the group header).</p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-3">
                            <AccordionTrigger>Can I leave a group?</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground leading-relaxed">
                                <div className="flex items-start gap-3">
                                    <LogOut className="h-5 w-5 text-orange-500 shrink-0 mt-1" />
                                    <div>
                                        <p className="mb-2">Yes, with one exception:</p>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li><strong>Members:</strong> Can leave any group at any time. You will lose access to its collections.</li>
                                            <li><strong>Owners:</strong> The creator of a group <strong>cannot leave</strong> it. To leave, you must delete the group entirely (which deletes it for everyone).</li>
                                        </ul>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-4">
                            <AccordionTrigger>Is my chat history private?</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground leading-relaxed">
                                <div className="flex items-start gap-3">
                                    <MessageSquare className="h-5 w-5 text-blue-500 shrink-0 mt-1" />
                                    <div>
                                        <strong className="text-foreground">Yes.</strong>
                                        <p>
                                            Even in a shared Group Collection, <strong>your chat history is unique to you.</strong> 
                                            Other members can see the documents in the collection, but they cannot see the questions you ask or the answers you receive.
                                        </p>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                    </Accordion>
                </section>

                <Separator />

                {/* Section 3: Getting Best Answers (GIGO) */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Lightbulb className="h-6 w-6 text-yellow-500" /> Getting the Best Answers
                    </h2>
                    
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200 flex items-center gap-2 mb-4">
                            <AlertTriangle className="h-5 w-5" />
                            Garbage In, Garbage Out
                        </h3>
                        <p className="text-sm text-yellow-800/80 dark:text-yellow-200/80 mb-4 leading-relaxed">
                            The AI is powerful, but it is not magic. It can only answer questions based on the documents you upload. If the documents are poor quality, the answers will be poor quality.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div>
                                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">❌ What to Avoid</h4>
                                <ul className="text-sm space-y-2 text-yellow-800/80 dark:text-yellow-200/80">
                                    <li>• Blurry scans or photos of paper documents.</li>
                                    <li>• Handwritten notes (OCR often struggles).</li>
                                    <li>• Documents with no text (only images).</li>
                                    <li>• Asking "What does this document say?" (Too vague).</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">✅ Best Practices</h4>
                                <ul className="text-sm space-y-2 text-yellow-800/80 dark:text-yellow-200/80">
                                    <li>• Upload clean, digital PDFs or Word docs.</li>
                                    <li>• Ensure charts and tables are high resolution.</li>
                                    <li>• Break very large topics into separate Collections.</li>
                                    <li>• Ask specific questions: <em>"Summarize the financial risks in Q3"</em> instead of <em>"What are the risks?"</em></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 4: Workflow Summary */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Search className="h-6 w-6 text-primary" /> Workflow Summary
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg bg-card">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold mb-3">1</div>
                            <h3 className="font-semibold mb-2">Create</h3>
                            <p className="text-sm text-muted-foreground">Create a Collection in your Personal space or inside a Group.</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-card">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold mb-3">2</div>
                            <h3 className="font-semibold mb-2">Upload</h3>
                            <p className="text-sm text-muted-foreground">Upload PDFs, Docs, or PowerPoints. Wait for the Processing bar to finish.</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-card">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold mb-3">3</div>
                            <h3 className="font-semibold mb-2">Chat</h3>
                            <p className="text-sm text-muted-foreground">Ask questions. The AI will cite its sources so you can see where the answers are coming from.</p>
                        </div>
                    </div>
                </section>

                <div className="h-12" /> {/* Spacer */}
            </div>
        </div>
    );
};