import Header from '../components/layout/Header';
import Hero from '../components/home/Hero';
import FeaturedProperties from '../components/home/FeaturedProperties';
import SearchSection from '../components/home/SearchSection';
import CitiesSection from '../components/home/CitiesSection';
import StatsSection from '../components/home/StatsSection';
import Footer from '../components/layout/Footer';

export default function Home() {
  return (
    <div className="min-h-full">
      <Header />
      <main>
        <Hero />
        <SearchSection />
        <FeaturedProperties />
        <CitiesSection />
        <StatsSection />
      </main>
      <Footer />
    </div>
  );
}
