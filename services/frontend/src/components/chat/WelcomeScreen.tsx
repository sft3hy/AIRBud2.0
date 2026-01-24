import React from "react";
import { Link } from "react-router-dom";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserStatus } from "../UserStatus";
import doggieSrc from "../../assets/doggie.svg";

export const WelcomeScreen = () => (
  <div className="flex h-full w-full flex-col bg-transparent">
    <div className="z-10 flex items-center justify-between border-b bg-background/80 backdrop-blur-md px-6 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <FolderOpen className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-semibold leading-none">Collections</h1>
          <p className="text-xs text-muted-foreground mt-1 leading-none">
            Create knowledge bases and chat
          </p>
        </div>
      </div>
      <UserStatus />
    </div>
    <div className="flex flex-col items-center justify-center flex-1 p-8 text-center rounded-xl m-4 animate-in fade-in duration-500">
      <div className="mb-6 h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.2)]">
        <img src={doggieSrc} alt="AIRBud 2.0" className="h-16 w-16" />
      </div>
      <h2 className="text-3xl font-bold mb-4">👋 Welcome to AIRBud 2.0</h2>
      <p className="text-lg text-muted-foreground mb-4 max-w-md">
        Create or select a collection from the sidebar to begin. Or check out
        some groups!
      </p>
      <div className="flex gap-4">
        <Link to="/help">
          <Button variant="link" className="text-primary gap-1 text-base">
            User Guide <span aria-hidden="true">&rarr;</span>
          </Button>
        </Link>
        <Link to="/system-overview">
          <Button variant="link" className="text-primary gap-1 text-base">
            System Overview <span aria-hidden="true">&rarr;</span>
          </Button>
        </Link>
        <Link to="/our-team">
          <Button variant="link" className="text-primary gap-1 text-base">
            Our team <span aria-hidden="true">&rarr;</span>
          </Button>
        </Link>
      </div>
    </div>
  </div>
);
