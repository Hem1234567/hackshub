import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Code2, Users, Trophy, Rocket, Globe, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';

const features = [
  {
    icon: Code2,
    title: 'Build Amazing Projects',
    description: 'Turn your ideas into reality with like-minded developers in time-boxed sprints.',
  },
  {
    icon: Users,
    title: 'Form Dream Teams',
    description: 'Connect with talented developers, designers, and innovators from around the world.',
  },
  {
    icon: Trophy,
    title: 'Win Prizes',
    description: 'Compete for exciting prizes, recognition, and opportunities to showcase your skills.',
  },
];

const stats = [
  { value: '10K+', label: 'Hackers' },
  { value: '500+', label: 'Hackathons' },
  { value: '$1M+', label: 'Prizes' },
  { value: '150+', label: 'Countries' },
];

export default function Index() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center bg-background overflow-hidden border-b-4 border-black dark:border-white py-20">
        {/* Geometric Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-[5%] w-16 h-16 md:top-20 md:left-[10%] md:w-32 md:h-32 bg-primary border-4 border-black dark:border-white shadow-neo" />
          <div className="absolute bottom-10 right-[5%] w-24 h-24 md:bottom-20 md:right-[10%] md:w-48 md:h-48 bg-secondary border-4 border-black dark:border-white shadow-neo" />
          <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border-4 border-black/5 dark:border-white/5 rounded-full" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: "circOut" }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-black shadow-neo-sm mb-8 transform -rotate-2">
              <Zap className="w-4 h-4 text-black" />
              <span className="text-sm font-bold text-black uppercase">The #1 Platform for Hackathons</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-8xl font-black mb-4 sm:mb-6 leading-none tracking-tighter uppercase relative">
              Build, Innovate,<br />
              <span className="text-primary bg-black px-4 transform skew-x-[-10deg] inline-block mt-2">Win Together</span>
            </h1>

            <p className="text-lg md:text-2xl font-mono font-bold text-muted-foreground mb-10 max-w-2xl mx-auto bg-white/50 p-2 border-2 border-transparent">
              Join the world's most vibrant hackathon community. Discover events,
              form teams, and build projects.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link to="/hackathons" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-primary text-black border-4 border-black shadow-neo hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] px-8 py-8 text-xl font-black uppercase tracking-tight"
                >
                  Explore Hackathons
                  <ArrowRight className="ml-2 w-6 h-6" />
                </Button>
              </Link>
              <Link to="/auth?mode=signup" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto bg-white text-black border-4 border-black shadow-neo hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] px-8 py-8 text-xl font-black uppercase tracking-tight"
                >
                  Start Organizing
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="mt-12 sm:mt-24 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-8 max-w-5xl mx-auto">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="text-center p-4 md:p-6 border-4 border-black dark:border-white bg-white dark:bg-black shadow-neo transform hover:-translate-y-2 transition-transform duration-100"
              >
                <div className="text-3xl md:text-5xl font-black text-black dark:text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-xs md:text-sm font-bold font-mono uppercase tracking-widest text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-background border-b-4 border-black dark:border-white relative">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4">
              Why <span className="text-white bg-black px-2">Hackathon Hub</span>?
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground font-mono max-w-2xl mx-auto">
              EVERYTHING YOU NEED TO DOMINATE
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="bg-card border-4 border-black dark:border-white p-6 md:p-8 shadow-neo hover:shadow-neo-lg transition-shadow duration-200"
              >
                <div className="w-16 h-16 bg-primary border-4 border-black flex items-center justify-center mb-6 shadow-neo-sm">
                  <feature.icon className="w-8 h-8 text-black" />
                </div>
                <h3 className="text-2xl font-black uppercase mb-3">{feature.title}</h3>
                <p className="text-muted-foreground font-medium">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 relative overflow-hidden bg-secondary border-b-4 border-black">
        <div className="container mx-auto px-4 relative z-10">
          <div className="bg-white border-4 border-black p-8 md:p-16 text-center max-w-4xl mx-auto shadow-neo-lg">
            <Globe className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 text-black" />
            <h2 className="text-4xl md:text-6xl font-black uppercase mb-6 tracking-tighter">
              Ready to <span className="text-primary bg-black px-2 inline-block transform -rotate-1">Start?</span>
            </h2>
            <p className="text-xl font-bold mb-10 max-w-2xl mx-auto">
              JOIN THE REVOLUTION. BUILD THE FUTURE.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link to="/auth?mode=signup">
                <Button
                  size="lg"
                  className="bg-black text-white hover:bg-black/90 border-4 border-transparent px-8 py-6 text-xl uppercase font-black"
                >
                  <Rocket className="mr-2 w-6 h-6" />
                  Join Now
                </Button>
              </Link>
              <Link to="/hackathons">
                <Button size="lg" variant="outline" className="bg-white text-black border-4 border-black hover:bg-gray-100 px-8 py-6 text-xl uppercase font-black">
                  Browse Hackathons
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-black text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary flex items-center justify-center border-2 border-white">
                <span className="text-black font-black text-xl">H</span>
              </div>
              <span className="font-black text-2xl uppercase tracking-tighter">Hackathon Hub</span>
            </div>
            <p className="text-gray-400 font-mono text-sm uppercase">
              © 2024 Hackathon Hub. Built for Builders.
            </p>
          </div>
        </div>
      </footer>
    </Layout>
  );
}
