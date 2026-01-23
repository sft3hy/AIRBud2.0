import React from "react";
import { Link } from "react-router-dom";
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
  LogOut,
  Video,
  Presentation,
  FileSpreadsheet,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { ClassificationBanner } from "../components/ClassificationBanner";

export const Help = () => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-transparent font-sans selection:bg-primary/20">
      {/* Top Banner */}
      <div className="flex-shrink-0 z-50">
        <ClassificationBanner />
      </div>

      <div className="flex-1 overflow-y-auto relative scroll-smooth">
        {/* Local Background Removed - Using Global App Background */}

        <div className="relative z-10 min-h-full p-6 md:p-12 animate-in fade-in duration-700 slide-in-from-bottom-4">
          <div className="mx-auto space-y-12">
            {/* Sticky Header */}
            <div className="sticky top-0 z-40 -mx-6 md:-mx-12 px-6 md:px-12 py-4 bg-background/80 backdrop-blur-sm border-b border-border/40 flex items-center justify-between transition-all">
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
                <HelpCircle className="h-4 w-4" />
                <span className="text-xs uppercase tracking-widest">
                  Documentation
                </span>
              </div>
            </div>

            {/* Title Section */}
            <div className="space-y-4">
              <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                User Guide & Help
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
                Welcome to Automated Information Retriever Buddy (AIRBud) 2.0.
                Maximize your document intelligence and collaboration workflows.
              </p>
            </div>

            {/* Section 1: Core Concepts */}
            <section className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                Core Concepts
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Collections Card */}
                <Card className="bg-card/40 backdrop-blur-md border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-full">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      Collections
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      Think of a <strong>Collection</strong> as a dedicated
                      project binder. It is a container for specific documents
                      relating to a single topic.
                    </p>
                    <p>
                      When you chat with a Collection, the AI{" "}
                      <strong>only</strong> reads the documents inside that
                      specific folder, ensuring answers are highly relevant.
                    </p>

                    {/* Embedded File Types Accordion */}
                    <div className="pt-2">
                      <Accordion
                        type="single"
                        collapsible
                        className="w-full bg-background/50 rounded-lg border border-border/50"
                      >
                        <AccordionItem value="file-types" className="border-0">
                          <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline hover:bg-muted/50 rounded-t-lg transition-all">
                            <span className="flex items-center gap-2">
                              Supported File Types
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                              {/* File Type Items */}
                              {[
                                {
                                  icon: FileText,
                                  color: "text-red-500",
                                  bg: "bg-red-500/10",
                                  label: "PDF (.pdf)",
                                },
                                {
                                  icon: FileText,
                                  color: "text-blue-500",
                                  bg: "bg-blue-500/10",
                                  label: "Word (.docx)",
                                },
                                {
                                  icon: FileText,
                                  color: "text-slate-500",
                                  bg: "bg-slate-500/10",
                                  label: "Text (.txt)",
                                },
                                {
                                  icon: Presentation,
                                  color: "text-orange-500",
                                  bg: "bg-orange-500/10",
                                  label: "PowerPoint (.pptx)",
                                },
                                {
                                  icon: Video,
                                  color: "text-purple-500",
                                  bg: "bg-purple-500/10",
                                  label: "Video (.mp4)",
                                },
                                {
                                  icon: FileSpreadsheet,
                                  color: "text-green-500",
                                  bg: "bg-green-500/10",
                                  label: "Excel (.xlsx)",
                                },
                              ].map((file, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-3 p-2 rounded-md bg-background border shadow-sm"
                                >
                                  <div
                                    className={`p-2 rounded-full ${file.bg} ${file.color}`}
                                  >
                                    <file.icon className="h-4 w-4" />
                                  </div>
                                  <span className="font-medium text-foreground text-xs">
                                    {file.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </CardContent>
                </Card>

                {/* Groups Card */}
                <Card className="bg-card/40 backdrop-blur-md border-l-4 border-l-purple-500 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-full">
                        <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      Groups
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground leading-relaxed">
                    <p className="mb-6">
                      A <strong>Group</strong> is a team workspace that allows
                      you to share Collections with other people instantly.
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                        <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 shrink-0" />
                        <p>
                          <strong className="text-foreground block">
                            Personal Group:
                          </strong>
                          Your default private space. Only you can see
                          collections in this group.
                        </p>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                        <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 shrink-0" />
                        <p>
                          <strong className="text-foreground block">
                            Shared Groups:
                          </strong>
                          Collections here are visible to every member of the
                          group.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            <Separator className="bg-border/60" />

            {/* Section 2: Permissions & Logic */}
            <section className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-500" />
                  </div>
                  Permissions & Rules
                </h2>
                <p className="text-muted-foreground ml-12">
                  Key protocols for data security and team management.
                </p>
              </div>

              <Card className="bg-card/30 border-none shadow-none">
                <Accordion
                  type="single"
                  collapsible
                  className="w-full space-y-4"
                >
                  <AccordionItem
                    value="item-1"
                    className="border rounded-lg bg-card/40 px-2"
                  >
                    <AccordionTrigger className="hover:no-underline hover:text-primary px-2 py-4 text-base font-semibold">
                      Who can delete a Collection/Document/Group?
                    </AccordionTrigger>
                    <AccordionContent className="px-2 text-muted-foreground leading-relaxed pt-2 pb-4">
                      <div className="flex items-start gap-4 p-4 bg-background/50 rounded-lg border">
                        <Trash2 className="h-5 w-5 text-red-500 shrink-0 mt-1" />
                        <div className="space-y-3">
                          <strong className="text-foreground block text-lg">
                            The Golden Rule of Ownership
                          </strong>
                          <p>
                            You can only delete what you created. If you are the
                            creator of a group/collection, you can delete it.
                            For documents, only collection owners can delete
                            documents.
                          </p>
                          <ul className="list-disc pl-5 space-y-1 text-sm marker:text-primary">
                            <li>
                              If you created the Collection/Group, you will see
                              the Delete button.
                            </li>
                            <li>
                              If a teammate created it, you{" "}
                              <strong>cannot</strong> delete it. You can only
                              view and chat.
                            </li>
                          </ul>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="item-2"
                    className="border rounded-lg bg-card/40 px-2"
                  >
                    <AccordionTrigger className="hover:no-underline hover:text-primary px-2 py-4 text-base font-semibold">
                      How do Public vs. Private Groups work?
                    </AccordionTrigger>
                    <AccordionContent className="px-2 text-muted-foreground leading-relaxed space-y-4 pt-2 pb-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border bg-background/50">
                          <strong className="text-foreground block mb-2 flex items-center gap-2">
                            <Users className="h-4 w-4" /> Public Groups
                          </strong>
                          <p className="text-sm">
                            Listed in the "Explore Public" tab. Anyone in the
                            organization can see them and click{" "}
                            <strong>Join</strong> to access.
                          </p>
                        </div>
                        <div className="p-4 rounded-lg border bg-background/50">
                          <strong className="text-foreground block mb-2 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" /> Private Groups
                          </strong>
                          <p className="text-sm">
                            Hidden from the Explore tab. Access is restricted to
                            invitation only via an <strong>Invite Link</strong>{" "}
                            sent by a member.
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="item-3"
                    className="border rounded-lg bg-card/40 px-2"
                  >
                    <AccordionTrigger className="hover:no-underline hover:text-primary px-2 py-4 text-base font-semibold">
                      Can I leave a group?
                    </AccordionTrigger>
                    <AccordionContent className="px-2 text-muted-foreground leading-relaxed pt-2 pb-4">
                      <div className="flex items-start gap-3">
                        <LogOut className="h-5 w-5 text-orange-500 shrink-0 mt-1" />
                        <div>
                          <p className="mb-2">Yes, with one exception:</p>
                          <ul className="list-disc pl-5 space-y-1 text-sm marker:text-orange-500">
                            <li>
                              <strong>Members:</strong> Can leave any group at
                              any time. You lose access immediately.
                            </li>
                            <li>
                              <strong>Owners:</strong> The creator of a group{" "}
                              <strong>cannot leave</strong> it. To leave, you
                              must delete the group entirely.
                            </li>
                          </ul>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="item-4"
                    className="border rounded-lg bg-card/40 px-2"
                  >
                    <AccordionTrigger className="hover:no-underline hover:text-primary px-2 py-4 text-base font-semibold">
                      Is my chat history private?
                    </AccordionTrigger>
                    <AccordionContent className="px-2 text-muted-foreground leading-relaxed pt-2 pb-4">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-5 w-5 text-blue-500 shrink-0 mt-1" />
                        <div>
                          <strong className="text-foreground">Yes.</strong>
                          <p className="text-sm mt-1">
                            Even in a shared Group Collection,{" "}
                            <strong>your chat history is unique to you.</strong>{" "}
                            Other members can see the documents, but they cannot
                            see your conversations.
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            </section>

            <Separator className="bg-border/60" />

            {/* Section 3: Getting Best Answers */}
            <section className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                </div>
                Getting the Best Answers
              </h2>

              <div className="bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-8 shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                  <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                    Garbage In, Garbage Out
                  </h3>
                </div>
                <p className="text-sm text-yellow-800/80 dark:text-yellow-200/80 mb-6 leading-relaxed max-w-4xl">
                  The AI can only answer questions based on the documents you
                  upload. If the documents are poor quality, the answers will
                  reflect that.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/60 dark:bg-black/40 p-5 rounded-lg border border-red-500/20">
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 text-xs">
                        ✕
                      </span>
                      What to Avoid
                    </h4>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li>• Blurry scans or photos of paper documents.</li>
                      <li>• Handwritten notes (OCR often struggles).</li>
                      <li>• Documents containing only images with no text.</li>
                      <li>
                        • Asking vague questions like "What does this say?"
                      </li>
                    </ul>
                  </div>
                  <div className="bg-white/60 dark:bg-black/40 p-5 rounded-lg border border-green-500/20">
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 text-xs">
                        ✓
                      </span>
                      Best Practices
                    </h4>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li>• Upload clean, digital PDFs or Word docs.</li>
                      <li>• Ensure charts and tables are high resolution.</li>
                      <li>
                        • Break very large topics into separate Collections.
                      </li>
                      <li>• Ask specific questions for specific results.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Workflow Summary */}
            <section className="space-y-6 pb-12">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                Workflow Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    id: 1,
                    title: "Create",
                    desc: "Create a Collection in your Personal space or inside a Group.",
                  },
                  {
                    id: 2,
                    title: "Upload",
                    desc: "Upload PDFs, Docs, or PowerPoints. Wait for the processing bar to complete.",
                  },
                  {
                    id: 3,
                    title: "Chat",
                    desc: "Ask questions. The AI will cite its sources so you can verify the answers.",
                  },
                ].map((step) => (
                  <div
                    key={step.id}
                    className="p-6 border rounded-xl bg-card/40 backdrop-blur-md hover:bg-accent/5 hover:border-primary/30 transition-all duration-300 group"
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl mb-4 group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                      {step.id}
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 z-50">
        <ClassificationBanner />
      </div>
    </div>
  );
};
