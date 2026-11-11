export const summaryColumns=[
 {key:'matter',label:'Matter',maxLength:12000},
 {key:'decision',label:'Decision',maxLength:8000},
 {key:'responsibilities',label:'Responsibilities',maxLength:8000},
 {key:'dueDate',label:'Due date',maxLength:10},
 {key:'remarks',label:'Remarks',maxLength:8000},
] as const;

export type SummaryRow=Record<typeof summaryColumns[number]['key'],string>;

export function emptySummaryRow():SummaryRow{
 return {matter:'',decision:'',responsibilities:'',dueDate:'',remarks:''};
}

export function summaryRows(notes:{rows?:SummaryRow[];summary:string;decisions:string;actions:string}):SummaryRow[]{
 if(notes.rows)return notes.rows;
 if(!notes.summary&&!notes.decisions&&!notes.actions)return [];
 return [{...emptySummaryRow(),matter:notes.summary,decision:notes.decisions,responsibilities:notes.actions}];
}
