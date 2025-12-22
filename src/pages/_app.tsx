import type { AppProps } from "next/app";
import "../styles/globals.css";
import "../styles/styles.scss";
import { useRouter } from "next/router";
import { LanguageProvider } from "../i18n/languageContext";
import AdminLayout from "../components/AdminLayout";
import PriestLayout from "../components/PriestLayout";
import { Toaster } from "sonner";

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isAdmin = router.pathname.startsWith("/admin");
  const isPriest = router.pathname.startsWith("/priest");

  if (isAdmin) {
    return (
      <LanguageProvider>
        <AdminLayout>
          <Toaster />
          <Component {...pageProps} />
        </AdminLayout>
      </LanguageProvider>
    );
  }

  if (isPriest) {
    return (
      <LanguageProvider>
        <PriestLayout>
          <Toaster />
          <Component {...pageProps} />
        </PriestLayout>
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <Toaster />
      <Component {...pageProps} />
    </LanguageProvider>
  );
}
