import { motion } from 'framer-motion';

const developers = [
  {
    name: 'Keenan Muhammad Otthmar Emzed',
    role: 'Model Developer',
    desc: 'Developed and trained the AI model for wheat disease classification.',
  },
  {
    name: 'I Gede Janardhana Abby',
    role: 'Web Developer',
    desc: 'Built the website and integrated the AI model for seamless user experience.',
  },
  {
    name: 'Taufiqurrahman Hamdan Al Ayubi',
    role: 'Paper Author',
    desc: 'Authored the research paper detailing the model architecture and dataset.',
  },
  {
    name: 'Dr. Abdul Haris Rangkuti, S.Kom., M.M., M.Si.',
    role: 'Project Mentor',
    desc: 'Provided guidance and mentorship throughout the project development process.',
  },
];

const About = () => {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 space-y-16">
      {/* About */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 text-center"
      >
        <h1
          className="text-3xl font-bold tracking-tight lg:text-4xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          About This Website
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground leading-relaxed">
          This website uses AI to help farmers and agricultural professionals
          identify wheat plant diseases quickly and accurately through image
          classification. Simply upload a photo of a wheat leaf, and our model
          will analyze it in seconds.
        </p>
      </motion.div>

      {/* Developers */}
      <div className="space-y-8">
        <h2
          className="text-center text-2xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Meet the Developers
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {developers.map((dev, i) => (
            <motion.div
              key={dev.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
            >
              <div className="flex items-start gap-4">
                <div className="space-y-1">
                  <h3
                    className="font-semibold"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {dev.name}
                  </h3>
                  <p className="text-xs font-medium text-primary">{dev.role}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {dev.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Institution */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col items-center gap-4 pt-4 border-t border-border"
      >
        <p className="text-sm text-muted-foreground">Supported by</p>
        <div className="rounded-2xl border border-border bg-white px-8 py-4">
          <img
            src="/Logo_Binus_University.png"
            alt="Binus University"
            className="h-16 object-contain"
          />
        </div>
      </motion.div>
    </div>
  );
};

export default About;
