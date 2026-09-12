import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import SimpleFooter from '../components/common/SimpleFooter';
import LoadingState from '../components/common/LoadingState';
import PropertyBreadcrumb from '../components/property-details/PropertyBreadcrumb';
import PropertyHeroImage from '../components/property-details/PropertyHeroImage';
import PropertyHeader from '../components/property-details/PropertyHeader';
import PropertyAbout from '../components/property-details/PropertyAbout';
import PropertyAmenities from '../components/property-details/PropertyAmenities';
import PropertyLocation from '../components/property-details/PropertyLocation';
import ScheduleViewingCard from '../components/property-details/ScheduleViewingCard';
import { BlockchainRegistryCard } from '../components/property-details/BlockchainRegistryCard';
import { propertiesAPI } from '../services/api';
import { useSEO } from '../hooks/useSEO';
import StructuredData from '../components/common/StructuredData';
import { formatPrice } from '../utils/formatPrice';
import glassPavilion from '../images/The Glass Pavilion.jpg';
import skylinePenthouse from '../images/Skyline Penthouse.jpg';
import coastalRetreat from '../images/Coastal Retreat.jpg';

interface PropertyData {
  _id: string;
  title: string;
  location: string;
  price: number;
  image: string[];
  beds: number;
  baths: number;
  sqm: number;
  type: string;
  availability: string;
  description: string;
  amenities: string[];
  phone: string;
  googleMapLink?: string;
}

// Explicit standalone properties for assessment evaluation without backend
const STANDALONE_ASSESSMENT_PROPERTIES: Record<string, PropertyData> = {
  '1': {
    _id: 'blockchain-assessment-property',
    title: 'The Glass Pavilion',
    location: '124 Innovation Way, Silicon Beach, CA',
    price: 12500000,
    image: [glassPavilion],
    beds: 6,
    baths: 5,
    sqm: 8200,
    type: 'Villa',
    availability: 'For Sale',
    description:
      'The Glass Pavilion is an architectural masterpiece designed for decentralized title tokenization and ownership registry on the Polygon blockchain. Features floor-to-ceiling panoramic glass, sustainable solar microgrid, private infinity pool, and immutable deed verification.',
    amenities: ['Swimming Pool', 'Security', 'Gym', 'Gated Community', 'Garden', 'Smart Home Automation', 'Parking'],
    phone: '+1 (555) 019-2834',
    googleMapLink: 'https://maps.google.com/?q=Montecito,California',
  },
  '2': {
    _id: 'blockchain-assessment-property-2',
    title: 'Skyline Penthouse',
    location: '888 Ocean Boulevard, Miami, FL',
    price: 8750000,
    image: [skylinePenthouse],
    beds: 4,
    baths: 4,
    sqm: 5400,
    type: 'Penthouse',
    availability: 'For Sale',
    description:
      'Skyline Penthouse offers breathtaking panoramic ocean and skyline views from the 54th floor. Features private elevator access, wraparound terrace, custom Italian kitchen, and smart contract deed integration on Polygon Amoy.',
    amenities: ['Private Elevator', 'Rooftop Terrace', 'Concierge', 'Valet Parking', 'Infinity Spa', 'Smart Home Automation'],
    phone: '+1 (555) 028-4912',
    googleMapLink: 'https://maps.google.com/?q=Miami,Florida',
  },
  '3': {
    _id: 'blockchain-assessment-property-3',
    title: 'Coastal Retreat',
    location: '42 Pelican Point, Malibu, CA',
    price: 6900000,
    image: [coastalRetreat],
    beds: 5,
    baths: 4,
    sqm: 4800,
    type: 'Beach House',
    availability: 'For Sale',
    description:
      'A serene oceanfront sanctuary with direct private beach access. Architecturally sculpted with sustainable teak and glass, featuring outdoor fire lounges, solar battery storage, and verifiable title on Polygon.',
    amenities: ['Direct Beach Access', 'Fire Pit', 'Solar Microgrid', 'Wine Cellar', 'Heated Pool', 'Security'],
    phone: '+1 (555) 039-7821',
    googleMapLink: 'https://maps.google.com/?q=Malibu,California',
  },
};

const isEnvStandalone = import.meta.env.VITE_STANDALONE_MODE === 'true';

const PropertyDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStandaloneMode, setIsStandaloneMode] = useState<boolean>(isEnvStandalone);

  // Dynamic SEO based on loaded property
  useSEO({
    title: property ? `${property.title} - ${property.location}` : 'Property Details',
    description: property
      ? `${property.title} in ${property.location}. ${property.beds} beds, ${property.baths} baths, ${property.sqm} sqm. ${property.type}.`
      : 'View property details on REChain.',
  });

  const enableStandaloneMode = useCallback((targetId?: string) => {
    const key = targetId && STANDALONE_ASSESSMENT_PROPERTIES[targetId] ? targetId : '1';
    setProperty(STANDALONE_ASSESSMENT_PROPERTIES[key] || STANDALONE_ASSESSMENT_PROPERTIES['1']);
    setIsStandaloneMode(true);
    setError(null);
    setLoading(false);
  }, []);

  const disableStandaloneMode = useCallback(() => {
    setIsStandaloneMode(false);
    setProperty(null);
    if (searchParams.get('standalone')) {
      searchParams.delete('standalone');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  const fetchProperty = useCallback(async () => {
    if (!id) return;

    // Configured via .env variable or URL parameter
    if (isEnvStandalone || searchParams.get('standalone') === 'true' || id === 'standalone') {
      enableStandaloneMode(id);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data } = await propertiesAPI.getById(id);
      if (data.success && data.property) {
        setProperty(data.property);
        setIsStandaloneMode(false);
      } else {
        setError('Property not found in database.');
      }
    } catch (err: any) {
      console.warn('Backend API connection failed:', err.message);
      setError('Backend API is offline or unreachable at http://localhost:4000.');
    } finally {
      setLoading(false);
    }
  }, [id, searchParams, enableStandaloneMode]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  // Map availability to status
  const getStatus = (availability: string): 'available' | 'sold' | 'pending' => {
    switch (availability?.toLowerCase()) {
      case 'sold': return 'sold';
      case 'pending': return 'pending';
      default: return 'available';
    }
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen">
        <Navbar />
        <LoadingState message="Loading property details..." />
        <SimpleFooter />
      </div>
    );
  }

  // Error State: explicitly displays when backend is offline and offers explicit opt-in
  if ((error || !property) && !isStandaloneMode) {
    return (
      <div className="bg-[#FAF8F5] min-h-screen">
        <Navbar />
        <div className="max-w-xl mx-auto px-6 py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-6">
            <span className="material-icons text-3xl">cloud_off</span>
          </div>

          <h2 className="font-fraunces text-2xl font-bold text-[#1F2937] mb-2">
            Backend API Not Reachable
          </h2>

          <p className="font-manrope text-sm text-[#4B5563] mb-3">
            {error || 'Could not fetch property from the backend API.'}
          </p>

          <div className="p-4 rounded-xl bg-white border border-[#E6E0DA] text-left text-xs text-[#6B7280] font-manrope mb-6 space-y-2">
            <div className="font-semibold text-[#1F2937] flex items-center space-x-1.5">
              <span className="material-icons text-base text-[#D4755B]">info</span>
              <span>Assessment Requirement Notice</span>
            </div>
            <p>
              The technical assessment specifies: <strong className="text-[#1F2937]">"No backend needed. Just frontend + ethers.js."</strong>
            </p>
            <p>
              You can explicitly opt in to load a standalone test property deed to test and demonstrate the smart contract integration on Polygon Amoy.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => enableStandaloneMode(id)}
              className="w-full bg-[#D4755B] hover:bg-[#B86851] text-white font-manrope font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer text-sm"
            >
              Opt-In: Load Standalone Property for Blockchain Assessment
            </button>

            <div className="flex items-center justify-center space-x-4 pt-2">
              <button
                onClick={fetchProperty}
                className="font-manrope text-xs font-semibold text-[#6B7280] hover:text-[#1F2937] transition cursor-pointer"
              >
                Retry API Connection
              </button>
              <span className="text-[#D1D5DB]">•</span>
              <Link
                to="/properties"
                className="font-manrope text-xs font-semibold text-[#D4755B] hover:underline"
              >
                Back to Properties
              </Link>
            </div>
          </div>
        </div>
        <SimpleFooter />
      </div>
    );
  }

  if (!property) return null;

  // Extract city from location string
  const cityParts = property.location.split(',').map(s => s.trim());
  const city = cityParts.length >= 3
    ? cityParts[cityParts.length - 2]
    : cityParts.length === 2
      ? cityParts[0]
      : cityParts[0];

  // Parse amenities
  const parseAmenities = (amenities: string[]): string[] => {
    if (!amenities || amenities.length === 0) return [];
    if (amenities.length === 1 && typeof amenities[0] === 'string' && amenities[0].startsWith('[')) {
      try {
        const parsed = JSON.parse(amenities[0]);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* fall through */ }
    }
    return amenities;
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Explicit Standalone Mode Notification Banner */}
      {isStandaloneMode && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5">
          <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-manrope text-amber-900">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>
                <strong>Standalone Assessment Mode:</strong> Active via {isEnvStandalone ? <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold text-amber-950">VITE_STANDALONE_MODE=true (.env)</code> : 'explicit opt-in'}.
              </span>
            </div>

            {/* Quick Switcher for Testing Multiple On-Chain Registrations */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-semibold text-amber-800">Test Properties:</span>
              <Link
                to="/property/1"
                className={`px-2.5 py-1 rounded-md transition font-medium ${
                  id === '1' || !id || id === 'standalone'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'bg-amber-100/80 text-amber-900 hover:bg-amber-200'
                }`}
              >
                #1 Glass Pavilion
              </Link>
              <Link
                to="/property/2"
                className={`px-2.5 py-1 rounded-md transition font-medium ${
                  id === '2'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'bg-amber-100/80 text-amber-900 hover:bg-amber-200'
                }`}
              >
                #2 Skyline Penthouse
              </Link>
              <Link
                to="/property/3"
                className={`px-2.5 py-1 rounded-md transition font-medium ${
                  id === '3'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'bg-amber-100/80 text-amber-900 hover:bg-amber-200'
                }`}
              >
                #3 Coastal Retreat
              </Link>
            </div>

            {!isEnvStandalone && (
              <button
                onClick={disableStandaloneMode}
                className="text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer shrink-0"
              >
                Exit Standalone Mode
              </button>
            )}
          </div>
        </div>
      )}

      {/* Property Structured Data for SEO */}
      <StructuredData
        type="property"
        data={{
          title: property.title,
          description: property.description,
          location: city,
          region: cityParts[cityParts.length - 1] || '',
          price: property.price,
          sqm: property.sqm,
          beds: property.beds,
          baths: property.baths,
          image: property.image?.[0],
        }}
      />

      {/* Navigation */}
      <Navbar />

      {/* Breadcrumb Navigation */}
      <PropertyBreadcrumb
        city={city}
        propertyName={property.title}
      />

      {/* Hero Image */}
      <PropertyHeroImage image={property.image?.[0]} />

      {/* Property Header with Price & Specs */}
      <PropertyHeader
        status={getStatus(property.availability)}
        refNumber={`#${property._id.slice(-8).toUpperCase()}`}
        name={property.title}
        location={property.location}
        price={formatPrice(property.price)}
        beds={property.beds}
        baths={property.baths}
        sqm={property.sqm}
      />

      {/* Main Content Area */}
      <div className="bg-[#F2EFE9] py-12">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2">
              <div className="bg-white border border-[#E6E0DA] rounded-2xl p-8 shadow-sm">
                {/* About Section */}
                <PropertyAbout description={property.description} />

                {/* Amenities Section */}
                <PropertyAmenities
                  amenities={parseAmenities(property.amenities)}
                />

                {/* Location Section */}
                <PropertyLocation
                  location={property.location}
                  propertyName={property.title}
                  googleMapLink={property.googleMapLink}
                />
              </div>
            </div>

            {/* Right Column - Blockchain Registry & Schedule Viewing */}
            <div className="lg:col-span-1 space-y-6">
              <BlockchainRegistryCard property={property} />
              <ScheduleViewingCard
                property={{ name: property.title, id: property._id }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Simple Footer */}
      <SimpleFooter />
    </div>
  );
};

export default PropertyDetailsPage;
