import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";

export default function NotFound() {
  return (
    <div class="py-16 text-center">
      <Title>Not found · kosync-rs-web</Title>
      <HttpStatusCode code={404} />
      <h1 class="text-2xl font-semibold">Page not found</h1>
      <p class="text-base-content/60 mt-2">There is nothing at this address.</p>
      <A href="/" class="btn mt-6">
        Back to the dashboard
      </A>
    </div>
  );
}
