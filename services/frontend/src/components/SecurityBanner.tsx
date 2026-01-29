import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Monitor, Terminal } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";

export const SecurityBanner = () => {
    // Show on every initial load/reload by default
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
            if (e.key === "Enter") setIsOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleAccept = () => {
        setIsOpen(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 z-[10000] flex items-center justify-center bg-background/60 backdrop-blur-md p-4 md:p-8"
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300, delay: 0.1 }}
                        className="w-full max-w-4xl max-h-[90vh] flex flex-col"
                    >
                        <Card className="relative overflow-hidden border-2 border-primary/20 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] flex flex-col h-full bg-card/80 backdrop-blur-xl">
                            {/* Decorative Top Border */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-destructive to-primary" />

                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute right-4 top-4 z-10 p-2 rounded-full hover:bg-destructive/10 transition-colors group"
                            >
                                <X className="h-5 w-5 text-destructive group-hover:scale-110 transition-transform" />
                                <span className="sr-only">Close</span>
                            </button>

                            <CardHeader className="bg-muted/10 border-b border-border/50 py-6">
                                <div className="flex items-center justify-center gap-3 mb-2">

                                    <CardTitle className="text-2xl font-black tracking-tighter text-center uppercase">
                                        System Access Notice
                                    </CardTitle>

                                </div>
                                <p className="text-center text-xs font-bold text-muted-foreground/60 tracking-widest uppercase">
                                    Privacy Act Statement & System Notice
                                </p>
                            </CardHeader>

                            <CardContent className="flex-1 overflow-y-auto py-8 px-6 md:px-12 space-y-8">
                                <div className="bg-destructive/5 border-l-4 border-destructive p-4 rounded-r-lg">
                                    <p className="text-sm font-black text-destructive uppercase tracking-tight leading-tight">
                                        (U) NOTE: There are no classified or sensitive discussions authorized for this network.
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 bg-primary/10 p-1.5 rounded-md">
                                            <Monitor className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-black uppercase text-foreground tracking-widest flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                Standard Security Banner
                                            </h4>
                                            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                                                You are accessing a United States Government (USG)-authorized information system,
                                                which includes (1) this computer, (2) this computer network, (3) all computers
                                                connected to this network, and (4) all devices and storage media attached to this
                                                network or to a computer on this network.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 bg-primary/10 p-1.5 rounded-md">
                                            <Terminal className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black uppercase text-foreground tracking-widest flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                Authorized Use & Consent
                                            </h4>
                                            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                                                This information system is provided for USG-authorized use only.
                                                Unauthorized or improper use of this system may result in disciplinary action,
                                                as well as civil and criminal penalties.
                                            </p>
                                            <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                                                <p className="text-[13px] text-foreground font-semibold leading-relaxed">
                                                    By using this information system, you understand and consent to the following:
                                                </p>
                                                <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground list-disc pl-5 font-medium">
                                                    <li>You have no reasonable expectation of privacy regarding communications or data transiting or stored on this information system.</li>
                                                    <li>At any time, and for any lawful USG purpose, the USG may monitor, intercept, and search any communication or data transiting or stored on this information system.</li>
                                                    <li>Any communications or data transiting or stored on this information system may be disclosed or used for any lawful USG purpose.</li>
                                                </ul>
                                            </div>
                                            <p className="text-xs font-bold text-foreground/70 italic border-t border-border/50 pt-4">
                                                This policy is binding, and may not be altered without prior official approval.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="flex justify-end p-6 bg-muted/20 border-t border-border/50 backdrop-blur-sm">
                                <div className="flex items-center gap-4">
                                    <Button
                                        onClick={handleAccept}
                                        className="h-12 px-12 font-black uppercase tracking-tighter text-base shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all hover:scale-105 active:scale-95 bg-primary hover:bg-primary/90"
                                    >
                                        Accept
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
