import { summarizeDocument } from "@/services/aiService";

export default async function Home() {
  const summary = await summarizeDocument(
    "Artificial Intelligence is transforming modern software development.",
  );

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-xl">{summary}</p>
    </main>
  );
}

// import { supabase } from "@/lib/supabase";

// export default async function Home() {
//   const { data, error } = await supabase.auth.getSession();

//   return (
//     <main className="flex min-h-screen items-center justify-center">
//       <h1 className="text-2xl font-bold">Supabase Connected</h1>
//     </main>
//   );
// }

// // export default function Home() {
// //   return (
// //     <main className="flex min-h-screen items-center justify-center bg-gray-100">
// //       <h1 className="text-4xl font-bold text-blue-600">
// //         AI SaaS Project Setup Successful
// //       </h1>
// //     </main>
// //   );
// // }
