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
  ChevronDown,
  FileSpreadsheet,
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

export const Help = () => {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header & Back Button */}
        <div className="space-y-6 border-b pb-8">
          <Link to="/">
            <Button
              variant="ghost"
              className="gap-2 pl-0 hover:bg-transparent hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              User Guide & Help
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
              Welcome to Automated Information Retriever Buddy (AIRBud) 2.0.
              Master your document organization and collaboration workflows.
            </p>
          </div>
        </div>

        {/* Section 1: Core Concepts */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            Core Concepts
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Collections Card */}
            <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-full">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Collections
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>
                  Think of a <strong>Collection</strong> as a dedicated project
                  binder. It is a container for specific documents relating to a
                  single topic.
                </p>
                <p>
                  When you chat with a Collection, the AI <strong>only</strong>{" "}
                  reads the documents inside that specific folder, ensuring
                  answers are highly relevant.
                </p>

                {/* Embedded File Types Accordion */}
                <div className="pt-2">
                  <Accordion
                    type="single"
                    collapsible
                    className="w-full bg-muted/30 rounded-lg border border-border/50"
                  >
                    <AccordionItem value="file-types" className="border-0">
                      <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline hover:bg-muted/50 rounded-t-lg transition-all">
                        <span className="flex items-center gap-2">
                          Supported File Types
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {/* PDF */}
                          <div className="flex items-center gap-3 p-2 rounded-md bg-background border shadow-sm">
                            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                              <FileText className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-foreground">
                              PDF (.pdf)
                            </span>
                          </div>
                          {/* Word */}
                          <div className="flex items-center gap-3 p-2 rounded-md bg-background border shadow-sm">
                            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                              <FileText className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-foreground">
                              Word (.docx)
                            </span>
                          </div>
                          {/* Text */}
                          <div className="flex items-center gap-3 p-2 rounded-md bg-background border shadow-sm">
                            <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              <FileText className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-foreground">
                              Text (.txt)
                            </span>
                          </div>
                          {/* PowerPoint */}
                          <div className="flex items-center gap-3 p-2 rounded-md bg-background border shadow-sm">
                            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                              <Presentation className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-foreground">
                              PowerPoint (.pptx)
                            </span>
                          </div>
                          {/* Video */}
                          <div className="flex items-center gap-3 p-2 rounded-md bg-background border shadow-sm">
                            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                              <Video className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-foreground">
                              Video (.mp4)
                            </span>
                          </div>
                          <div className="flex items-center gap-3 p-2 rounded-md bg-background border shadow-sm">
                            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                              <FileSpreadsheet className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-foreground">
                              Excel Spreadsheet (.xlsx)
                            </span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </CardContent>
            </Card>

            {/* Groups Card */}
            <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-full">
                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  Groups
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed">
                <p className="mb-4">
                  A <strong>Group</strong> is a team workspace that allows you
                  to share Collections with other people instantly.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2" />
                    <p>
                      <strong className="text-foreground">
                        Personal Group:
                      </strong>{" "}
                      Your default private space. Only you can see collections
                      in this group.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2" />
                    <p>
                      <strong className="text-foreground">
                        Shared Groups:
                      </strong>{" "}
                      Collections here are visible to every member of the group.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Section 2: Permissions & Logic */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-500" />
            </div>
            Permissions & Rules
          </h2>
          <p className="text-muted-foreground">
            Key protocols for data security and team management.
          </p>

          <Accordion type="single" collapsible className="w-full">
            {/* Removed "Supported File Types" from here as requested */}

            <AccordionItem value="item-1">
              <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-lg">
                Who can delete a Collection/Document/Group?
              </AccordionTrigger>
              <AccordionContent className="px-4 text-muted-foreground leading-relaxed pt-2">
                <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border">
                  <Trash2 className="h-5 w-5 text-red-500 shrink-0 mt-1" />
                  <div>
                    <strong className="text-foreground block mb-2">
                      The Golden Rule of Ownership
                    </strong>
                    <p className="mb-2">
                      You can only delete what you created. If you are the
                      creator of a group/collection, you can delete it. For
                      documents, only collection owners can delete documents.
                      That means if you are not the collection owner and want a
                      document deleted, you must reach out to the colleciton
                      owner for deletion.
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>
                        If you created the Collection/Group, you will see the
                        Delete button.
                      </li>
                      <li>
                        If a teammate created the Collection/Group, you{" "}
                        <strong>cannot</strong> delete it. You can only view and
                        chat.
                      </li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-lg">
                How do Public vs. Private Groups work?
              </AccordionTrigger>
              <AccordionContent className="px-4 text-muted-foreground leading-relaxed space-y-4 pt-2">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border bg-card">
                    <strong className="text-foreground block mb-2">
                      Public Groups
                    </strong>
                    <p className="text-sm">
                      Listed in the "Explore Public" tab. Anyone in the
                      organization can see them and click <strong>Join</strong>{" "}
                      to access.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <strong className="text-foreground block mb-2">
                      Private Groups
                    </strong>
                    <p className="text-sm">
                      Hidden from the Explore tab. Access is restricted to
                      invitation only via an <strong>Invite Link</strong> sent
                      by a member.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-lg">
                Can I leave a group?
              </AccordionTrigger>
              <AccordionContent className="px-4 text-muted-foreground leading-relaxed pt-2">
                <div className="flex items-start gap-3">
                  <LogOut className="h-5 w-5 text-orange-500 shrink-0 mt-1" />
                  <div>
                    <p className="mb-2">Yes, with one exception:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>
                        <strong>Members:</strong> Can leave any group at any
                        time. You lose access immediately.
                      </li>
                      <li>
                        <strong>Owners:</strong> The creator of a group{" "}
                        <strong>cannot leave</strong> it. To leave, you must
                        delete the group entirely (which deletes it for
                        everyone).
                      </li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-lg">
                Is my chat history private?
              </AccordionTrigger>
              <AccordionContent className="px-4 text-muted-foreground leading-relaxed pt-2">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-500 shrink-0 mt-1" />
                  <div>
                    <strong className="text-foreground">Yes.</strong>
                    <p className="text-sm mt-1">
                      Even in a shared Group Collection,{" "}
                      <strong>your chat history is unique to you.</strong> Other
                      members can see the documents, but they cannot see your
                      conversations.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <Separator />

        {/* Section 3: Getting Best Answers */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
            </div>
            Getting the Best Answers
          </h2>

          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 shadow-sm">
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
              <div className="bg-white/50 dark:bg-black/20 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-3 flex items-center gap-2">
                  <span className="text-red-500">✕</span> What to Avoid
                </h4>
                <ul className="text-sm space-y-2 text-yellow-900/70 dark:text-yellow-100/70">
                  <li>• Blurry scans or photos of paper documents.</li>
                  <li>• Handwritten notes (OCR often struggles).</li>
                  <li>• Documents containing only images with no text.</li>
                  <li>• Asking vague questions like "What does this say?"</li>
                </ul>
              </div>
              <div className="bg-white/50 dark:bg-black/20 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-3 flex items-center gap-2">
                  <span className="text-green-600">✓</span> Best Practices
                </h4>
                <ul className="text-sm space-y-2 text-yellow-900/70 dark:text-yellow-100/70">
                  <li>• Upload clean, digital PDFs or Word docs.</li>
                  <li>• Ensure charts and tables are high resolution.</li>
                  <li>• Break very large topics into separate Collections.</li>
                  <li>• Ask specific questions for specific results.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Workflow Summary */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Search className="h-5 w-5 text-primary" />
            </div>
            Workflow Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 border rounded-xl bg-card hover:bg-accent/5 transition-colors">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-4">
                1
              </div>
              <h3 className="font-semibold text-lg mb-2">Create</h3>
              <p className="text-sm text-muted-foreground">
                Create a Collection in your Personal space or inside a Group.
              </p>
            </div>
            <div className="p-6 border rounded-xl bg-card hover:bg-accent/5 transition-colors">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-4">
                2
              </div>
              <h3 className="font-semibold text-lg mb-2">Upload</h3>
              <p className="text-sm text-muted-foreground">
                Upload PDFs, Docs, or PowerPoints. Wait for the processing bar
                to complete.
              </p>
            </div>
            <div className="p-6 border rounded-xl bg-card hover:bg-accent/5 transition-colors">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h3 className="font-semibold text-lg mb-2">Chat</h3>
              <p className="text-sm text-muted-foreground">
                Ask questions. The AI will cite its sources so you can verify
                the answers.
              </p>
            </div>
          </div>
        </section>
        <div className="h-12" />
      </div>
    </div>
  );
};
