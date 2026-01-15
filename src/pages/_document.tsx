import { Html, Head, Main, NextScript } from "next/document";
export default function Document() {
  return (
    <Html lang="en" data-theme="light">
      <meta name="viewport" content="width=device-width, initial-scale=1.0"></meta>
      <Head />
      <body className="bg-[url('/bg-mobile.png')] md:bg-[url('/bg.png')] bg-cover bg-center">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
