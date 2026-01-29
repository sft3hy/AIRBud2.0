import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Building2,
  Rocket,
  Satellite,
  Globe,
  Code2,
  Terminal,
  Cpu,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import doggieSrc from "../assets/doggie.svg";

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

export const Team = () => {
  return (
    <div className="h-full w-full overflow-hidden font-sans selection:bg-primary/20">
      <ScrollArea className="h-full w-full bg-transparent" scrollbarClassName="mt-17">
        {/* Sticky Header - Inside ScrollArea to allow content to scroll behind it */}
        <div className="sticky top-0 z-50 px-6 md:px-12 py-4 bg-background/60 backdrop-blur-sm border-b border-border/40 flex items-center justify-between transition-all">
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
            <Terminal className="h-4 w-4" />
            <span className="text-xs uppercase tracking-widest">Dev Team</span>
          </div>
        </div>

        <div className="mx-auto space-y-8 max-w-4xl px-4 py-8 scroll-smooth">
          <div className="relative z-10 min-h-full p-6 md:p-12 animate-in fade-in duration-700 slide-in-from-bottom-4">
            <div className="mx-auto space-y-12">
              <div className="max-w-5xl items-center">
                {/* Title Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/40">
                  <div className="space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                      Development Team
                    </h1>
                    <p className="text-xl text-muted-foreground">
                      The engineering & architecture behind AIRBud 2.0
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <div className="p-4 bg-card/50 backdrop-blur-sm border rounded-full shadow-lg hover:shadow-primary/20 transition-all duration-500 hover:scale-105">
                      <img src={doggieSrc} alt="Logo" className="h-12 w-12" />
                    </div>
                  </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  {/* Left Column: Lead Profile */}
                  <div className="lg:col-span-1 space-y-6">
                    <Card className="overflow-hidden border-primary/20 shadow-2xl bg-card/60 backdrop-blur-md group hover:border-primary/40 transition-all duration-500">
                      <div className="h-36 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>

                      <div className="px-6 relative">
                        <div className="absolute -top-14 left-6 h-28 w-28 rounded-2xl bg-gradient-to-tr from-violet-500 via-purple-500 to-fuchsia-500 border-[6px] border-background shadow-2xl flex items-center justify-center overflow-hidden">
                          <div className="rounded-5xl h-full w-full backdrop-blur-sm bg-white/10 flex items-center justify-center">
                            <Code2 className="rounded-full h-14 w-14 text-white drop-shadow-lg" strokeWidth={2.5} />
                          </div>
                        </div>
                      </div>

                      <CardContent className="pt-20 pb-8 px-6 space-y-6">
                        <div>
                          <h2 className="text-2xl font-bold">Sam Townsend</h2>
                          <p className="text-sm font-medium text-primary flex items-center gap-2">
                            Lead Software Engineer
                          </p>
                        </div>

                        <div className="space-y-4 pt-2">
                          <div className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <Building2 className="h-4 w-4 shrink-0 text-primary/70" />
                            <span>
                              Contractor,{" "}
                              <ExtLink href="https://www.arcfield.com/">
                                Arcfield
                              </ExtLink>
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
                            <span>La Jolla, California</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group/mail">
                            <Mail className="h-4 w-4 shrink-0 text-primary/70 group-hover/mail:text-primary transition-colors" />
                            <span className="break-all">
                              samuel.townsend@arcfield.com
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group/mail">
                            <Mail className="h-4 w-4 shrink-0 text-primary/70 group-hover/mail:text-primary transition-colors" />
                            <span className="break-all">townsesa@nro.mil</span>
                          </div>
                        </div>

                        <div className="pt-4 flex flex-wrap gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
                          >
                            Full Stack
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors"
                          >
                            Architecture
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors"
                          >
                            DevSecOps
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="p-5 rounded-xl border border-dashed bg-card/30 backdrop-blur-sm text-xs text-muted-foreground space-y-2">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <Terminal className="h-3 w-3" /> System Status
                      </div>
                      <p>
                        Maintained by the Cosmic Horizon development group. For
                        support or feature requests, please contact the I2SPO
                        program office.
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Organization Structure */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Org Hierarchy */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary" />
                        Organizational Hierarchy
                      </h3>

                      <div className="relative border rounded-xl bg-card/40 backdrop-blur-sm p-8 space-y-8 overflow-hidden">
                        {/* Vertical Line Connector */}
                        <div className="absolute left-[2.45rem] top-12 bottom-12 w-0.5 bg-gradient-to-b from-border via-primary/50 to-transparent" />

                        {/* Level 1: NRO */}
                        <div className="relative flex items-center gap-6 group">
                          <div className="h-10 w-10 rounded-full bg-background border shadow-sm flex items-center justify-center shrink-0 z-10 group-hover:border-primary/50 transition-colors">
                            <Satellite className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div>
                            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                              Agency
                            </div>
                            <div className="text-lg font-semibold">NRO</div>
                            <div className="text-sm text-muted-foreground">
                              National Reconnaissance Office
                            </div>
                          </div>
                        </div>

                        {/* Level 2: GED */}
                        <div className="relative flex items-center gap-6 group">
                          <div className="h-10 w-10 rounded-full bg-background border shadow-sm flex items-center justify-center shrink-0 z-10 group-hover:border-primary/50 transition-colors">
                            <Building2 className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div>
                            <div className="text-lg font-semibold">GED</div>
                            <div className="text-sm text-muted-foreground">
                              Ground Enterprise Directorate
                            </div>
                          </div>
                        </div>

                        {/* Level 3: I2SPO */}
                        <div className="relative flex items-center gap-6 group">
                          <div className="h-10 w-10 rounded-full bg-background border shadow-sm flex items-center justify-center shrink-0 z-10 group-hover:border-primary/50 transition-colors">
                            <Cpu className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div>
                            <div className="text-lg font-semibold">I2SPO</div>
                            <div className="text-sm text-muted-foreground">
                              Integrated Intelligence System Program Office
                            </div>
                          </div>
                        </div>

                        {/* Level 4: Cosmic Horizon */}
                        <div className="relative flex items-center gap-6">
                          <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 z-10 shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse">
                            <Rocket className="h-6 w-6 text-primary" />
                          </div>
                          <div className="bg-gradient-to-r from-card/80 to-background border p-5 rounded-lg shadow-sm flex-1 hover:border-primary/30 transition-all">
                            <div className="font-mono text-[10px] text-primary uppercase tracking-wider mb-1">
                              Development Group
                            </div>
                            <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                              Cosmic Horizon
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Advanced capability insertion and rapid prototyping.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tech Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Card className="bg-card/40 backdrop-blur-sm border-dashed hover:border-solid hover:border-primary/40 transition-all">
                        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                          <Code2 className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">
                            Tech Standard
                          </span>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground leading-relaxed">
                          Developed using modern React architecture, compliant
                          with secure coding standards for classified
                          environments.
                        </CardContent>
                      </Card>
                      <Card className="bg-card/40 backdrop-blur-sm border-dashed hover:border-solid hover:border-primary/40 transition-all">
                        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                          <Terminal className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">
                            Deployment
                          </span>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground leading-relaxed">
                          Containerized microservices deployed via Docker
                          orchestration for maximum portability and scalability.
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
