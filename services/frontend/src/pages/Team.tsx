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
import { Separator } from "@/components/ui/separator";
import doggieSrc from "../assets/doggie.svg"; // Keeping the mascot consistent

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
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12 relative overflow-hidden animate-in fade-in duration-500">
      {/* Background Ambience: "Cosmic Horizon" Vibe */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-96 w-96 rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-12 relative z-10">
        {/* Header & Back Button */}
        <div className="space-y-6">
          <Link to="/">
            <Button
              variant="ghost"
              className="gap-2 pl-0 hover:bg-transparent hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Return to Dashboard
            </Button>
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                Development Team
              </h1>
              <p className="text-xl text-muted-foreground">
                The engineering behind AIRBud 2.0
              </p>
            </div>
            <div className="hidden md:block">
              <div className="p-3 bg-card border rounded-full shadow-sm">
                <img src={doggieSrc} alt="Logo" className="h-10 w-10" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Left Column: The Developer Profile */}
          <div className="md:col-span-1 space-y-6">
            <Card className="overflow-hidden border-primary/20 shadow-lg bg-card/60 backdrop-blur-md group hover:border-primary/40 transition-all duration-300">
              <div className="h-32 bg-gradient-to-br from-blue-600 to-purple-600 relative">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
              </div>

              <div className="px-6 relative">
                <div className="absolute -top-12 left-6 h-24 w-24 rounded-2xl bg-background border-4 border-background shadow-xl flex items-center justify-center overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-3xl font-bold text-muted-foreground">
                    ST
                  </div>
                </div>
              </div>

              <CardContent className="pt-16 pb-8 px-6 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">Sam Townsend</h2>
                  <p className="text-sm font-medium text-primary">
                    Lead Software Engineer
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0 text-foreground/70" />
                    <span>
                      Contractor,{" "}
                      <ExtLink href="https://www.arcfield.com/">
                        Arcfield
                      </ExtLink>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 text-foreground/70" />
                    <span>La Jolla, California</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0 text-foreground/70" />
                    <span className="w-10">samuel.townsend@arcfield.com</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="bg-blue-500/5 hover:bg-blue-500/10 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                  >
                    Full Stack
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-purple-500/5 hover:bg-purple-500/10 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400"
                  >
                    Architecture
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <div className="p-4 rounded-xl border bg-card/50 text-xs text-muted-foreground space-y-2">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Terminal className="h-3 w-3" /> System Status
              </div>
              <p>
                Maintained by the Cosmic Horizon development group. For support
                or feature requests, please contact the I2SPO program office.
              </p>
            </div>
          </div>

          {/* Right Column: Organization Structure */}
          <div className="md:col-span-2 space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Organizational Hierarchy
              </h3>

              <div className="relative border rounded-xl bg-card/30 p-8 space-y-8">
                {/* Vertical Line Connector */}
                <div className="absolute left-[2.45rem] top-10 bottom-10 w-0.5 bg-gradient-to-b from-border to-transparent" />

                {/* Level 1: NRO */}
                <div className="relative flex items-center gap-6">
                  <div className="h-10 w-10 rounded-full bg-background border shadow-sm flex items-center justify-center shrink-0 z-10">
                    <Satellite className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Org
                    </div>
                    <div className="text-lg font-semibold">NRO</div>
                    <div className="text-sm text-muted-foreground">
                      National Reconnaissance Office
                    </div>
                  </div>
                </div>

                {/* Level 2: GED */}
                <div className="relative flex items-center gap-6">
                  <div className="h-10 w-10 rounded-full bg-background border shadow-sm flex items-center justify-center shrink-0 z-10">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">GED</div>
                    <div className="text-sm text-muted-foreground">
                      Ground Enterprise Directorate
                    </div>
                  </div>
                </div>

                {/* Level 3: I2SPO */}
                <div className="relative flex items-center gap-6">
                  <div className="h-10 w-10 rounded-full bg-background border shadow-sm flex items-center justify-center shrink-0 z-10">
                    <Cpu className="h-5 w-5 text-muted-foreground" />
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
                  <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 z-10 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <Rocket className="h-6 w-6 text-primary" />
                  </div>
                  <div className="bg-gradient-to-r from-card to-background border p-4 rounded-lg shadow-sm flex-1">
                    <div className="font-mono text-xs text-primary uppercase tracking-wider mb-1">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="bg-card/50 border-dashed">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                  <Code2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Tech Standard</span>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Developed using modern React architecture, compliant with
                  secure coding standards for classified environments.
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-dashed">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                  <Terminal className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Deployment</span>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Containerized microservices deployed via Docker orchestration
                  for maximum portability and scalability.
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
