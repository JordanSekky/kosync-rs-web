import { Title } from "@solidjs/meta";
import type { JSX } from "solid-js";

export default function PageHeader(props: {
  title: string;
  description?: JSX.Element;
  children?: JSX.Element;
}) {
  return (
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <Title>{props.title} · kosync-rs-web</Title>
      <div>
        <h1 class="text-2xl font-semibold">{props.title}</h1>
        {props.description && <p class="text-base-content/60 text-sm">{props.description}</p>}
      </div>
      <div class="flex flex-wrap items-center gap-2">{props.children}</div>
    </div>
  );
}
