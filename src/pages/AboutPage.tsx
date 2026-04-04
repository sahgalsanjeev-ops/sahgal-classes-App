import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-20 bg-background">
      <div className="bg-primary px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10"
            aria-label="Go back"
          >
            <ArrowLeft size={22} className="text-primary-foreground" />
          </button>
          <h1 className="text-base font-bold text-primary-foreground">About SAHGAL CLASSES</h1>
        </div>
      </div>

      <article className="px-4 mt-5 space-y-4 text-sm text-foreground leading-relaxed">
        <p className="text-muted-foreground">
          SAHGAL CLASSES has been dedicated to rigorous, outcome-focused mathematics instruction since{" "}
          <span className="font-semibold text-foreground">2006</span>. Over nearly two decades, the programme has
          supported aspirants across competitive and board examinations with a consistent emphasis on conceptual depth,
          disciplined problem-solving, and measurable results.
        </p>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-primary mb-2">IIT–JEE</h2>
          <p className="text-muted-foreground">
            Our IIT–JEE preparation is built on systematic coverage of the syllabus, regular assessment, and individual
            attention where it matters most. Alumni have achieved strong outcomes in the examination, including an{" "}
            <span className="font-semibold text-foreground">All India Rank of 747</span>—a benchmark that reflects both
            student commitment and the quality of guidance at SAHGAL CLASSES.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-primary mb-2">Boards (CBSE &amp; ISC)</h2>
          <p className="text-muted-foreground">
            For <span className="font-semibold text-foreground">Classes 11 and 12</span>, we deliver structured
            programmes aligned with <span className="font-semibold text-foreground">CBSE</span> and{" "}
            <span className="font-semibold text-foreground">ISC</span> requirements. The focus is on examination
            readiness, clarity of fundamentals, and accuracy under time constraints. To date,{" "}
            <span className="font-semibold text-foreground">twelve students</span> have secured{" "}
            <span className="font-semibold text-foreground">100 out of 100</span> in Mathematics—an outcome we attribute
            to precise teaching, sustained practice, and high standards of academic discipline.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-primary mb-2">Defence &amp; allied pathways</h2>
          <p className="text-muted-foreground">
            A significant number of our students have gone on to succeed in defence-oriented selection processes,
            including the <span className="font-semibold text-foreground">National Defence Academy (NDA)</span>. We are
            proud to have contributed to their preparation through robust quantitative training and strategic
            orientation suited to competitive entrance patterns.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-primary mb-2">Expanding offerings</h2>
          <p className="text-muted-foreground">
            Reflecting the evolving needs of higher education and professional admissions, SAHGAL CLASSES has introduced
            dedicated <span className="font-semibold text-foreground">Mathematics programmes for MBA entrance</span>{" "}
            preparation and for the{" "}
            <span className="font-semibold text-foreground">Common University Entrance Test (CUET)</span>. These
            courses apply the same pedagogical rigour and attention to syllabus alignment that define our established
            programmes.
          </p>
        </section>

        <p className="text-muted-foreground pb-2">
          We invite students and parents who value depth, accountability, and a long-term record of academic excellence
          to explore what SAHGAL CLASSES can offer at each stage of the journey—from school boards to India’s most
          competitive examinations.
        </p>
      </article>
    </div>
  );
};

export default AboutPage;
