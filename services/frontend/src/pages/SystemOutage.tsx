import React from "react";
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Activity,
  Construction,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ServiceStatus {
  name: string;
  status: "online" | "offline" | "degraded";
}

interface SystemOutageProps {
  services: Record<string, string>;
  onRetry: () => void;
}

export const SystemOutage: React.FC<SystemOutageProps> = ({
  services,
  onRetry,
}) => {
  // Convert API object to array for mapping
  const serviceList: ServiceStatus[] = Object.entries(services).map(
    ([name, status]) => ({
      name,
      status: status as "online" | "offline" | "degraded",
    })
  );

  const downCount = serviceList.filter((s) => s.status !== "online").length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-xl w-full space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="h-24 w-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Construction className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <div className="absolute bottom-0 right-0 bg-white dark:bg-slate-950 rounded-full p-1 border shadow-sm">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              System Maintenance
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 mt-2">
              We are currently experiencing issues with{" "}
              <span className="font-semibold text-red-600">
                {downCount} microservice{downCount !== 1 ? "s" : ""}
              </span>
              .
            </p>
          </div>
        </div>

        {/* Status Card */}
        <Card className="border-red-100 dark:border-red-900/50 shadow-lg">
          <CardHeader className="bg-slate-100/50 dark:bg-slate-900/50 pb-4 border-b">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Live Service Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {serviceList.map((svc) => (
                <div
                  key={svc.name}
                  className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {svc.name}
                  </span>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        svc.status === "online"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {svc.status}
                    </span>
                    {svc.status === "online" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 animate-pulse" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer Message */}
        <div className="text-center space-y-6">
          <div className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            Our engineering team has been notified and is working to restore
            full functionality. Please try refreshing in a few moments.
          </div>

          <Button
            size="lg"
            onClick={onRetry}
            className="gap-2 shadow-md bg-slate-900 hover:bg-slate-800 text-white px-8"
          >
            <RefreshCw className="h-4 w-4" /> Check Status
          </Button>
        </div>
      </div>
    </div>
  );
};
