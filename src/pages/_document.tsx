import { Html, Head, Main, NextScript } from "next/document";
export default function Document() {
  return (
    <Html lang="en" data-theme="light">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lato:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body className="bg-[url('/bg-mobile.png')] md:bg-[url('/bg.png')] bg-cover bg-center">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
