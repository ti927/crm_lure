import { redirect } from "next/navigation";

/**
 * O Kanban virou seção própria no menu lateral (17/08). Este redirecionamento
 * existe para não quebrar link que alguém já tenha guardado ou compartilhado
 * do endereço antigo.
 */
export default function KanbanMudouDeEndereco() {
  redirect("/kanban");
}
