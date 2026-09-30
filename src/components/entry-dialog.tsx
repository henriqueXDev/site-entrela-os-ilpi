import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DespesaForm, FolhaForm, MensalidadeForm } from "@/components/entry-forms";
import { useRole } from "@/lib/use-role";

export function NewEntryDialog({
  defaultTab = "mensalidade",
}: {
  defaultTab?: "mensalidade" | "despesa" | "folha";
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { canEdit } = useRole();
  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" /> Novo lançamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo lançamento</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="mensalidade" className="flex-1">
              Mensalidade
            </TabsTrigger>
            <TabsTrigger value="despesa" className="flex-1">
              Despesa
            </TabsTrigger>
            <TabsTrigger value="folha" className="flex-1">
              Folha
            </TabsTrigger>
          </TabsList>
          <TabsContent value="mensalidade">
            <MensalidadeForm onDone={close} />
          </TabsContent>
          <TabsContent value="despesa">
            <DespesaForm onDone={close} />
          </TabsContent>
          <TabsContent value="folha">
            <FolhaForm onDone={close} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
