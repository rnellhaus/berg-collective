import { useState, useEffect } from 'react';
import Button from '../../components/Button/Button';
import RsvpLightbox from '../../components/RsvpLightbox/RsvpLightbox';
import PhotoGallery from '../../components/PhotoGallery/PhotoGallery';
import usePageMeta from '../../hooks/usePageMeta';
import styles from './EventsPage.module.css';

const MONTH_ABBR = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function parseDateBadge(isoDate) {
  if (!isoDate) return { day: '', month: '' };
  const d = new Date(isoDate + 'T00:00:00');
  return { day: d.getDate(), month: MONTH_ABBR[d.getMonth()] };
}

function parseDateFull(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  return `${MONTH_FULL[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function coverUrl(path) {
  if (!path) return null;
  if (path.startsWith('/') || path.startsWith('http')) return path;
  return `/api/media/file/${path}`;
}

function coverUrlFull(path) {
  if (!path) return null;
  if (path.startsWith('/') || path.startsWith('http')) return path;
  // Swap 'medium/' for 'full/' to get the larger version
  return `/api/media/file/${path.replace(/^medium\//, 'full/')}`;
}

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'NYC', value: 'nyc' },
  { label: 'LA', value: 'la' },
  { label: 'ATL', value: 'atlanta' },
  { label: 'DC', value: 'dc' },
];

export default function EventsPage() {
  usePageMeta('Events', 'Upcoming summits, workshops, and networking events.');

  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [rsvpEvent, setRsvpEvent] = useState(null);
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [galleryTitle, setGalleryTitle] = useState('');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedData, setExpandedData] = useState({});

  useEffect(() => {
    async function fetchEvents() {
      try {
        const [upRes, pastRes] = await Promise.all([
          fetch('/api/events?status=upcoming'),
          fetch('/api/events?status=past'),
        ]);
        const upData = await upRes.json();
        const pastData = await pastRes.json();
        setUpcomingEvents(upData.events || []);
        setPastEvents(pastData.events || []);
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://embed.lu.ma/checkout-button.js';
    script.id = 'luma-checkout';
    document.body.appendChild(script);
    return () => {
      const s = document.getElementById('luma-checkout');
      if (s) s.remove();
    };
  }, []);

  async function toggleExpand(event) {
    if (expandedId === event.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(event.id);
    // Fetch full event details if not cached
    if (!expandedData[event.id]) {
      try {
        const res = await fetch(`/api/events/${event.id}`);
        const data = await res.json();
        setExpandedData(prev => ({ ...prev, [event.id]: data }));
      } catch (err) {
        console.error('Failed to fetch event details:', err);
      }
    }
  }

  function openRsvp(event) {
    setRsvpEvent(event);
    setRsvpOpen(true);
  }

  async function openGallery(eventId, eventTitle) {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      const data = await res.json();
      setGalleryPhotos(data.photos || []);
      setGalleryTitle(eventTitle);
      setGalleryOpen(true);
    } catch (err) {
      console.error('Failed to fetch event photos:', err);
    }
  }

  const featuredEvent = upcomingEvents.find((e) => e.is_featured === 1);

  const filteredUpcoming =
    activeFilter === 'all'
      ? upcomingEvents
      : upcomingEvents.filter(
          (e) => e.chapter && e.chapter.toLowerCase() === activeFilter
        );

  return (
    <main>
      {/* Section 1: Compact Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroBadge}>Events &amp; Summits</span>
          <h1
            className={styles.heroTitle}
            dangerouslySetInnerHTML={{
              __html: "Elevate Your <span style='color:#8b3223'>Leadership Journey</span>",
            }}
          />
          <p className={styles.heroSubtitle}>
            From intimate workshops to large-scale summits, BERG events connect you with the ideas,
            people, and opportunities that move your career forward.
          </p>
        </div>
      </section>

      {/* Section 2: Featured Event Card */}
      {!loading && featuredEvent && (
        <section className={styles.featured}>
          <div className={styles.featuredCard}>
            <div
              className={styles.featuredImageArea}
              style={
                coverUrlFull(featuredEvent.cover_image_url)
                  ? { backgroundImage: `url(${coverUrlFull(featuredEvent.cover_image_url)})` }
                  : {}
              }
            >
              <div className={styles.featuredImageOverlay} />
              <span className={styles.featuredBadge}>Featured</span>
              <div className={styles.featuredImageBottom}>
                <span className={styles.featuredImageDate}>
                  {parseDateFull(featuredEvent.date)}
                </span>
                <h3 className={styles.featuredImageTitle}>{featuredEvent.title}</h3>
              </div>
            </div>
            <div className={styles.featuredContent}>
              {featuredEvent.category && (
                <span className={styles.eventTag}>{featuredEvent.category}</span>
              )}
              <h3 className={styles.featuredTitle}>{featuredEvent.title}</h3>
              <p className={styles.featuredDesc}>{featuredEvent.description}</p>
              <div className={styles.featuredMeta}>
                <div className={styles.metaItem}>
                  <svg className={styles.metaIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>{parseDateFull(featuredEvent.date)}{featuredEvent.time ? ` · ${featuredEvent.time}` : ''}</span>
                </div>
                {featuredEvent.location && (
                  <div className={styles.metaItem}>
                    <svg className={styles.metaIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{featuredEvent.location}</span>
                  </div>
                )}
              </div>
              <Button variant="primary" onClick={() => openRsvp(featuredEvent)}>
                RSVP Now &rarr;
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Section 3: Upcoming Events List */}
      <section className={styles.upcoming}>
        <div className={styles.upcomingInner}>
          <div className={styles.upcomingHeader}>
            <h2 className={styles.sectionTitle}>Upcoming Events</h2>
            <div className={styles.filterTabs}>
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  className={`${styles.filterTab} ${activeFilter === f.value ? styles.filterTabActive : ''}`}
                  onClick={() => setActiveFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingState}>Loading events…</div>
          ) : filteredUpcoming.length === 0 ? (
            <div className={styles.emptyState}>
              {activeFilter === 'all'
                ? 'No upcoming events at this time.'
                : 'No upcoming events in this city.'}
            </div>
          ) : (
            <div className={styles.eventsList}>
              {filteredUpcoming.map((event) => {
                const { day, month } = parseDateBadge(event.date);
                const isExpanded = expandedId === event.id;
                const details = expandedData[event.id];
                return (
                  <div key={event.id} className={`${styles.eventRow} ${isExpanded ? styles.eventRowExpanded : ''}`}>
                    <div className={styles.eventRowHeader} onClick={() => toggleExpand(event)}>
                      <div className={styles.dateBadge}>
                        <span className={styles.dateBadgeDay}>{day}</span>
                        <span className={styles.dateBadgeMonth}>{month}</span>
                      </div>
                      <div className={styles.eventRowInfo}>
                        <h3 className={styles.eventRowTitle}>{event.title}</h3>
                        <p className={styles.eventRowMeta}>
                          {event.location && <span>{event.location}</span>}
                          {event.location && event.time && <span className={styles.metaDot}>·</span>}
                          {event.time && <span>{event.time}</span>}
                        </p>
                      </div>
                      {event.category && (
                        <span className={styles.eventTag}>{event.category}</span>
                      )}
                      <span className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ''}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                      </span>
                    </div>

                    {isExpanded && (
                      <div className={styles.expandedPanel}>
                        {/* Description */}
                        {event.description && (
                          <p className={styles.expandedDesc} style={{ whiteSpace: 'pre-line' }}>{event.description}</p>
                        )}

                        {/* Cover image / flyer */}
                        {coverUrl(event.cover_image_url) && (
                          <div className={styles.expandedFlyer}>
                            <img src={coverUrlFull(event.cover_image_url)} alt={`${event.title} flyer`} />
                          </div>
                        )}

                        {/* Event photos */}
                        {details && details.photos && details.photos.length > 0 && (
                          <div className={styles.expandedPhotos}>
                            <p className={styles.expandedPhotosLabel}>Event Photos</p>
                            <div className={styles.expandedPhotoGrid}>
                              {details.photos.slice(0, 6).map((photo, idx) => (
                                <div
                                  key={photo.media_id || idx}
                                  className={styles.expandedPhotoThumb}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setGalleryPhotos(details.photos);
                                    setGalleryTitle(event.title);
                                    setGalleryOpen(true);
                                  }}
                                >
                                  <img
                                    src={`/api/media/file/thumb/${photo.webp_thumb ? photo.webp_thumb.split('/').pop() : ''}`}
                                    alt={photo.alt_text || photo.caption || event.title}
                                    loading="lazy"
                                  />
                                  {idx === 5 && details.photos.length > 6 && (
                                    <div className={styles.expandedPhotoMore}>+{details.photos.length - 6}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Details row with RSVP */}
                        <div className={styles.expandedActions}>
                          <div className={styles.expandedMeta}>
                            <span className={styles.metaItem}>
                              <svg className={styles.metaIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                              {parseDateFull(event.date)}{event.time ? ` · ${event.time}` : ''}
                            </span>
                            {event.location && (
                              <span className={styles.metaItem}>
                                <svg className={styles.metaIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                {event.location}
                              </span>
                            )}
                          </div>
                          <Button variant="primary" onClick={(e) => { e.stopPropagation(); openRsvp(event); }}>
                            RSVP Now &rarr;
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Section 4: Past Events with Photo Galleries */}
      <section className={styles.past}>
        <div className={styles.pastInner}>
          <div className={styles.pastHeader}>
            <h2 className={styles.sectionTitle}>Past Events</h2>
            <p className={styles.pastSubtitle}>Relive the moments from our community gatherings</p>
          </div>

          {loading ? (
            <div className={styles.loadingState}>Loading past events…</div>
          ) : pastEvents.length === 0 ? (
            <div className={styles.emptyState}>No past events to display.</div>
          ) : (
            <div className={styles.pastGrid}>
              {pastEvents.map((event) => {
                const isExpanded = expandedId === event.id;
                const details = expandedData[event.id];
                return (
                  <div key={event.id} className={`${styles.pastCard} ${isExpanded ? styles.pastCardExpanded : ''}`}>
                    {/* Cover image / flyer at top if available */}
                    {coverUrl(event.cover_image_url) && (
                      <div className={styles.pastCardCover}>
                        <img src={coverUrlFull(event.cover_image_url)} alt={event.title} />
                      </div>
                    )}

                    {/* Photo strip preview (if no cover but has photos) */}
                    {!coverUrl(event.cover_image_url) && event.photo_count > 0 && (
                      <div className={styles.photoStrip}>
                        <div className={styles.photoThumbWide}>
                          <div className={styles.photoThumbPlaceholder} />
                        </div>
                        <div className={styles.photoThumb}>
                          <div className={styles.photoThumbPlaceholder} />
                        </div>
                        <div className={styles.photoThumb}>
                          {event.photo_count > 3 ? (
                            <div className={styles.photoThumbMore}>
                              <div className={styles.photoThumbPlaceholder} />
                              <div className={styles.photoThumbOverlay}>
                                +{event.photo_count - 3}
                              </div>
                            </div>
                          ) : (
                            <div className={styles.photoThumbPlaceholder} />
                          )}
                        </div>
                      </div>
                    )}

                    <div className={styles.pastCardBody}>
                      {/* Clickable title */}
                      <div className={styles.pastCardTitleRow} onClick={() => toggleExpand(event)}>
                        <h3 className={styles.pastCardTitle}>{event.title}</h3>
                        <span className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ''}`}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </span>
                      </div>

                      <div className={styles.pastCardMeta}>
                        {event.date && <span className={styles.pastCardDate}>{parseDateFull(event.date)}</span>}
                        {event.location && <span className={styles.pastCardLocation}>{event.location}</span>}
                        {event.photo_count > 0 && (
                          <span className={styles.pastCardPhotoCount}>
                            {event.photo_count} {event.photo_count === 1 ? 'photo' : 'photos'}
                          </span>
                        )}
                      </div>

                      {/* Expanded detail panel */}
                      {isExpanded && (
                        <div className={styles.pastExpandedPanel}>
                          {event.description && (
                            <p className={styles.expandedDesc}>{event.description}</p>
                          )}

                          {/* Photo gallery grid */}
                          {details && details.photos && details.photos.length > 0 && (
                            <div className={styles.expandedPhotos}>
                              <p className={styles.expandedPhotosLabel}>Event Photos & Lifestyle Shots</p>
                              <div className={styles.expandedPhotoGrid}>
                                {details.photos.slice(0, 8).map((photo, idx) => (
                                  <div
                                    key={photo.media_id || idx}
                                    className={styles.expandedPhotoThumb}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setGalleryPhotos(details.photos);
                                      setGalleryTitle(event.title);
                                      setGalleryOpen(true);
                                    }}
                                  >
                                    <img
                                      src={`/api/media/file/thumb/${photo.webp_thumb ? photo.webp_thumb.split('/').pop() : ''}`}
                                      alt={photo.alt_text || photo.caption || event.title}
                                      loading="lazy"
                                    />
                                    {idx === 7 && details.photos.length > 8 && (
                                      <div className={styles.expandedPhotoMore}>+{details.photos.length - 8}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {!details && (
                            <p className={styles.expandedLoading}>Loading details...</p>
                          )}

                          <div className={styles.expandedActions}>
                            {event.photo_count > 0 && (
                              <Button variant="secondary" onClick={(e) => { e.stopPropagation(); openGallery(event.id, event.title); }}>
                                View Full Gallery
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Section 5: CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Never Miss an Event</h2>
          <p className={styles.ctaSubtitle}>
            Members get early access, discounted tickets, and exclusive invitations to private BERG gatherings.
          </p>
          <Button variant="white" href="#">Become a Member</Button>
        </div>
      </section>

      {/* RSVP Lightbox */}
      <RsvpLightbox
        event={rsvpEvent}
        isOpen={rsvpOpen}
        onClose={() => setRsvpOpen(false)}
      />

      {/* Photo Gallery Lightbox */}
      <PhotoGallery
        photos={galleryPhotos}
        eventTitle={galleryTitle}
        initialIndex={0}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />
    </main>
  );
}
