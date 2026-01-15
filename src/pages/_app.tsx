import type { AppProps } from "next/app";
import Head from "next/head";
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

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      {isAdmin ? (
        <LanguageProvider>
          <AdminLayout>
            <Toaster />
            <Component {...pageProps} />
          </AdminLayout>
        </LanguageProvider>
      ) : isPriest ? (
        <LanguageProvider>
          <PriestLayout>
            <Toaster />
            <Component {...pageProps} />
          </PriestLayout>
        </LanguageProvider>
      ) : (
        <LanguageProvider>
          <Toaster />
          <Component {...pageProps} />
        </LanguageProvider>
      )}
    </>
  );
}
