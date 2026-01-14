import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" data-theme="light">
      <Head />
      <body className="bg-[url('/bg.png')] bg-cover bg-center">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
