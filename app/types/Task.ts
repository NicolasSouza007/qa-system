export type Column = "today" | "bugs" | "review" | "approved";

export type Task = {
  id: string;
  title: string;
  column: Column;
  priority: "high" | "medium" | "low";
  module: string;
  assignedTo: string;
};
