"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function VerifyEmailPage() {
  const { verifyEmail } = useAuth();
  const router = useRouter();
  const params = useParams();
  const token = params.token;

  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const data = await verifyEmail(token);
        if (cancelled) return;
        setStatus("success");
        setMessage(data?.message || "Email berhasil diverifikasi!");
        setTimeout(() => router.push("/login"), 3000);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          err.response?.data?.message || "Token tidak valid atau sudah expired.",
        );
      }
    };

    if (token) run();

    return () => {
      cancelled = true;
    };
  }, [router, token, verifyEmail]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Verifikasi Email</CardTitle>
          <CardDescription>
            {status === "loading"
              ? "Sedang memverifikasi email kamu..."
              : status === "success"
                ? "Berhasil!"
                : "Gagal"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" ? (
            <div className="text-sm text-muted-foreground text-center">
              Mohon tunggu sebentar.
            </div>
          ) : status === "success" ? (
            <div className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-sm p-4 rounded-md text-center">
              <p className="font-medium">{message}</p>
              <p className="mt-1">Mengalihkan ke halaman login...</p>
            </div>
          ) : (
            <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-md text-center">
              {message}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            type="button"
            className="w-full"
            variant={status === "success" ? "default" : "outline"}
            onClick={() => router.push("/login")}
          >
            Ke halaman login
          </Button>
          <Link
            href="/register"
            className="text-sm text-muted-foreground hover:underline text-center"
          >
            Buat akun lain
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

