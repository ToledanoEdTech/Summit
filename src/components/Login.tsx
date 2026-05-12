import { BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { loginWithGoogle } from '@/src/lib/firebase';
import { useState } from 'react';

export default function Login() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg rounded-2xl border-none">
        <CardHeader className="text-center pb-8 pt-10">
          <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center overflow-hidden">
            <object data="/assets/logo.png" type="image/png" className="h-full w-full object-contain">
               <BookOpen className="h-12 w-12 text-blue-600" />
            </object>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">מעקב לימודים</CardTitle>
          <CardDescription className="text-base text-slate-500 mt-2">
            התחבר באמצעות חשבון הגוגל שלך כדי לצפות במטלות, מגמות והספק אישי.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-10 px-8">
          <Button 
            className="w-full h-12 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all" 
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            התחברות עם גוגל
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
