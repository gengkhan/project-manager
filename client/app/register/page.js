"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterPage() {
  const { register, resendVerification } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResendMessage("");

    if (form.password !== form.confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok");
      return;
    }

    if (form.password.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }

    setLoading(true);

    try {
      await register(
        form.name,
        form.email,
        form.password,
        form.confirmPassword,
      );
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setResendMessage("");
    setResendLoading(true);
    try {
      const data = await resendVerification(form.email);
      setResendMessage(data?.message || "Tautan verifikasi telah dikirim.");
    } catch (err) {
      setError(err.response?.data?.message || "Terjadi kesalahan. Coba lagi.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {success ? "Cek Email Kamu" : "Buat Akun"}
          </CardTitle>
          <CardDescription>
            {success
              ? "Kami sudah mengirim tautan verifikasi. Silakan verifikasi untuk mengaktifkan akun."
              : "Daftar untuk mulai mengelola proyek tim kamu"}
          </CardDescription>
        </CardHeader>
        {success ? (
          <>
            <CardContent className="space-y-4 mb-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}
              {resendMessage && (
                <div className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-sm p-3 rounded-md">
                  {resendMessage}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                Kami telah mengirim email verifikasi ke{" "}
                <span className="font-medium text-foreground">{form.email}</span>.
                Silakan cek inbox atau folder spam kamu.
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                type="button"
                className="w-full"
                onClick={handleResend}
                disabled={resendLoading}
              >
                {resendLoading ? "Mengirim..." : "Kirim ulang email verifikasi"}
              </Button>
              <div className="flex w-full gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/login")}
                >
                  Kembali ke login
                </Button>
              </div>
            </CardFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 mb-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Nama lengkap kamu"
                  value={form.name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 8 karakter"
                    value={form.password}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ulangi password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Memproses..." : "Daftar"}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Sudah punya akun?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Masuk
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
