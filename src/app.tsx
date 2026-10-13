import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { Loading } from "~/components/Feedback";
import Layout from "~/components/Layout";
// Points the generated client at the configured API
import "~/lib/api";
import "./app.css";

export default function App() {
  return (
    <Router
      root={props => (
        <MetaProvider>
          <Title>kosync-rs-web</Title>
          <Layout>
            <Suspense fallback={<Loading />}>{props.children}</Suspense>
          </Layout>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
