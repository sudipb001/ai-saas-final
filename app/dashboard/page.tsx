"use client";

import Summarizer from "@/components/ai/Summarizer";
import Chatbot from "@/components/ai/Chatbot";
import FileUpload from "@/components/documents/FileUpload";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();

    router.push("/login");
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-10 gap-10">
      <div className="w-full max-w-4xl flex justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>

      <Summarizer />

      <Chatbot />

      <FileUpload />
    </main>
  );
}

// "use client";

// import Summarizer from "@/components/ai/Summarizer";
// import { supabase } from "@/lib/supabase";
// import { useRouter } from "next/navigation";

// export default function DashboardPage() {
//   const router = useRouter();

//   const handleLogout = async () => {
//     await supabase.auth.signOut();

//     router.push("/login");
//   };

//   return (
//     <main className="flex min-h-screen flex-col items-center p-10 gap-6">
//       <div className="w-full max-w-4xl flex justify-between">
//         <h1 className="text-3xl font-bold">Dashboard</h1>

//         <button
//           onClick={handleLogout}
//           className="bg-red-600 text-white px-4 py-2 rounded"
//         >
//           Logout
//         </button>
//       </div>

//       <Summarizer />
//     </main>
//   );
// }

// // "use client";

// // import { supabase } from "@/lib/supabase";
// // import { useRouter } from "next/navigation";

// // export default function DashboardPage() {
// //   const router = useRouter();

// //   const handleLogout = async () => {
// //     await supabase.auth.signOut();

// //     router.push("/login");
// //   };

// //   return (
// //     <main className="flex min-h-screen items-center justify-center flex-col">
// //       <h1 className="text-3xl font-bold mb-4">Dashboard</h1>

// //       <button
// //         className="bg-red-600 text-white px-4 py-2"
// //         onClick={handleLogout}
// //       >
// //         Logout
// //       </button>
// //     </main>
// //   );
// // }
