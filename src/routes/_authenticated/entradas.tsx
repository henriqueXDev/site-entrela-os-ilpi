import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppLayout, StatCard } from "@/components/app-layout";
import { NewEntryDialog } from "@/components/entry-dialog";
import { PeriodFilter } from "@/components/period-filter";
import {
  brl,
  dateBR,
  fetchMensalidades,
  MESES,
  ym,
  yearsFrom,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/entradas")({
  head: () => ({
    meta: [
      { title: "Entradas mensais — Entrelaços" },
      {
        name: "description",
        content:
          "Mensalidades previstas e recebidas mês a mês na ILPI Entrelaços.",
      },
      { property: "og:title", content: "Entradas mensais — Entrelaços" },
      {
        property: "og:description",
        content: "Mensalidades previstas e recebidas mês a mês.",
      },
    ],
  }),
  component: Entradas;
});

function Entradas() {
  return null;
}
