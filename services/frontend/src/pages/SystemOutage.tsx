import React from "react";
import {
  AlertTriangle,
  RefreshCw,
  XCircle,
  Activity,
  AlertOctagon,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClassificationBanner } from "../components/ClassificationBanner"; // <--- Import

interface SystemOutageProps {
  services: Record<string, string>;
  onRetry: () => void;
}

export const SystemOutage: React.FC<SystemOutageProps> = ({
  services,
  onRetry,
}) => {
  const serviceList = Object.entries(services).map(([name, status]) => ({
    name,
    status: status.toLowerCase(),
  }));

  const downCount = serviceList.filter((s) => !s.status.includes("online")).length;
  const isTotalOutage = downCount === serviceList.length;

  return (
    /* Outer Container: Transparent to show Global Background */
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-transparent relative">
      {/* Top Banner - Frozen at Top */}
      <div className="z-20">
        <ClassificationBanner />
      </div>

      {/* Middle Section - Scrollable Area */}
      {/* flex-1: Fills remaining space */}
      {/* overflow-y-auto: Allows scrolling ONLY within this area */}
      <div className="flex-1 overflow-y-auto relative z-10">
        {/* Inner Content Container */}
        {/* min-h-full: Ensures vertical centering works if content is short */}
        <div className="min-h-full flex flex-col items-center justify-center p-6">
          <div className="max-w-lg w-full space-y-8">
            {/* Header Icon */}
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              <div className="relative">
                <div className="h-24 w-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center animate-pulse">
                  {isTotalOutage ? (
                    <WifiOff className="h-10 w-10 text-red-600 dark:text-red-400" />
                  ) : (
                    <AlertOctagon className="h-10 w-10 text-orange-600 dark:text-orange-400" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-background/80 rounded-full p-1.5 shadow-sm border">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight">
                  System {isTotalOutage ? "Offline" : "Disruption"}
                </h1>
                <p className="text-muted-foreground">
                  We are experiencing connectivity issues with{" "}
                  <span className="font-semibold text-red-500">
                    {downCount} service{downCount !== 1 ? "s" : ""}
                  </span>
                  .
                </p>
              </div>
            </div>

            {/* Status Card */}
            <Card className="border-red-200 dark:border-red-900/30 shadow-lg overflow-hidden bg-card/80 backdrop-blur-sm">
              <CardHeader className="bg-muted/30 pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5" /> Real-time Status
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono opacity-70"
                  >
                    LIVE
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {serviceList.map((svc) => (
                    <div
                      key={svc.name}
                      className="flex items-center justify-between p-4 px-5 hover:bg-muted/20 transition-colors"
                    >
                      <span className="font-mono text-sm font-medium text-foreground/80">
                        {svc.name}
                      </span>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-bold tracking-wide ${svc.status.includes("online")
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                            }`}
                        >
                          {svc.status.toUpperCase()}
                        </span>
                        {svc.status.includes("online") ? (
                          <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </div>
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Area */}
            <div className="text-center space-y-6 pt-2">
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Our engineering team is currently investigating. Updates will
                push automatically.
              </p>

              <Button
                size="lg"
                onClick={onRetry}
                className="w-full sm:w-auto min-w-[200px] gap-2 shadow-md font-semibold"
              >
                <RefreshCw className="h-4 w-4" />
                Recheck Connection
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Banner - Frozen at Bottom */}
      <div className="z-20">
        <ClassificationBanner />
      </div>
    </div>
  );
};
