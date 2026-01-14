import React, { useEffect, useState } from 'react';
import { ShieldCheck, LockKeyhole, AlertTriangle, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { api } from '@/lib/api';
import doggieSrc from '../assets/doggie.svg';

export const LoginPage = () => {
    const [debugInfo, setDebugInfo] = useState<any>(null);

    // Fetch debug info on mount
    useEffect(() => {
        api.get('/auth/debug')
            .then(res => setDebugInfo(res.data))
            .catch(err => setDebugInfo({ error: "Could not reach backend" }));
    }, []);

    const handleLogin = () => {
        // --- FIX 2: Navigation Cache Buster ---
        // By changing the URL query param, we force the browser to treat this 
        // as a fresh navigation event, creating a new SSL connection.
        window.location.href = "/?login_attempt=" + new Date().getTime();
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-muted/20 p-4">
            <Card className="max-w-md w-full p-8 flex flex-col items-center text-center shadow-xl border-t-4 border-t-primary">

                <div className="mb-6 h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center">
                    <img src={doggieSrc} alt="Smart RAG" className="h-16 w-16" />
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight mb-2">Smart RAG</h1>
                <p className="text-muted-foreground mb-8">
                    Secure Enterprise Document Intelligence
                </p>

                <div className="w-full space-y-4">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg text-sm flex gap-3 items-start text-left border border-yellow-100 dark:border-yellow-800">
                        <LockKeyhole className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-semibold block mb-1">Authentication Required</span>
                            You must insert your CAC/PIV Smart Card to access this system.
                        </div>
                    </div>

                    <Button
                        size="lg"
                        className="w-full gap-2 text-lg h-12 shadow-md hover:shadow-lg transition-all"
                        onClick={handleLogin}
                    >
                        <ShieldCheck className="h-5 w-5" />
                        Login with CAC / PIV
                    </Button>

                    {/* Debug Section */}
                    <Accordion type="single" collapsible className="w-full border-t pt-2">
                        <AccordionItem value="debug" className="border-none">
                            <AccordionTrigger className="text-xs text-muted-foreground py-2 justify-center hover:no-underline gap-2">
                                <Bug className="h-3 w-3" /> Connection Diagnostics
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="bg-muted/50 p-3 rounded-md text-left text-xs font-mono break-all space-y-2 border">
                                    {debugInfo ? (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="font-bold">Client Verify:</span>
                                                <span className={debugInfo['x-client-verify'] === 'SUCCESS' ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                                                    {debugInfo['x-client-verify']}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="font-bold">Subject DN:</span>
                                                <p className="mt-1 text-muted-foreground">{debugInfo['x-subject-dn']}</p>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground mt-2">
                                                {debugInfo['x-client-verify'] !== 'SUCCESS' &&
                                                    "⚠️ Nginx did not validate your certificate. Check if your card is inserted or if you clicked Cancel."}
                                            </div>
                                        </>
                                    ) : (
                                        <span>Loading diagnostics...</span>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </Card>

            <div className="mt-8 text-xs text-muted-foreground">
                Authorized Use Only &bull; DoD PKI Enabled
            </div>
        </div>
    );
};