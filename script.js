// Global variables
window.animationSpeed = 1;
window.animationStep = 450;
window.isAnimationPaused = true;
window.animationInterval = null;

// Error handling and logging utilities
const logError = (message, error = null, context = '') => {
    const timestamp = new Date().toISOString();
    const errorInfo = {
        timestamp,
        message,
        context,
        error: error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
        } : null
    };
    
    console.error('🚨 HATA:', errorInfo);
    
    try {
        const existingErrors = JSON.parse(localStorage.getItem('earthquake_errors') || '[]');
        existingErrors.push(errorInfo);
        if (existingErrors.length > 50) existingErrors.shift();
        localStorage.setItem('earthquake_errors', JSON.stringify(existingErrors));
    } catch (storageError) {
        console.warn('Hata kaydetme başarısız:', storageError);
    }
};

const logWarning = (message, context = '') => {
    const timestamp = new Date().toISOString();
    console.warn('⚠️ UYARI:', { timestamp, message, context });
};

const logInfo = (message, context = '') => {
    const timestamp = new Date().toISOString();
    console.log('ℹ️ BİLGİ:', { timestamp, message, context });
};

// Helper function to format date in Turkish format
const formatTurkishDate = (timestamp) => {
    try {
        if (!timestamp || isNaN(timestamp)) {
            throw new Error(`Geçersiz timestamp: ${timestamp}`);
        }
        
        const date = new Date(timestamp * 1000);
        if (isNaN(date.getTime())) {
            throw new Error(`Geçersiz tarih: ${timestamp}`);
        }
        
        const months = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];
        
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${day} ${month} ${year} ${hours}:${minutes}`;
            
        } catch (error) {
        logError('Tarih formatlama hatası', error, 'formatTurkishDate');
        return 'Geçersiz tarih';
    }
};

// Message display function
const showMessage = (message, isError = false) => {
    try {
        let messageElement = document.getElementById('message');
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.id = 'message';
            messageElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                z-index: 10000;
                max-width: 300px;
                word-wrap: break-word;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                transition: all 0.3s ease;
            `;
            document.body.appendChild(messageElement);
        }
        
        messageElement.textContent = message;
        messageElement.style.background = isError 
            ? 'linear-gradient(135deg, #ff6b6b, #ee5a24)' 
            : 'linear-gradient(135deg, #4ecdc4, #44a08d)';
        
        messageElement.style.opacity = '1';
        messageElement.style.transform = 'translateX(0)';
        
        setTimeout(() => {
            messageElement.style.opacity = '0';
            messageElement.style.transform = 'translateX(100%)';
        }, 3000);
        
    } catch (error) {
        logError('Mesaj gösterme hatası', error, 'showMessage');
        console.log(message);
    }
};

// KML parsing function (moved here to be defined before loadDefaultKML)
const parseKMLTextAndShowOnMap = (kmlText, sourceName) => {
    try {
        logInfo(`KML parse başlatıldı: ${sourceName}`, 'parseKMLTextAndShowOnMap');
        
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(kmlText, 'text/xml');
        
        if (kmlDoc.documentElement.nodeName === 'parsererror') {
            throw new Error('KML parse hatası');
        }
        
        logInfo('KML XML parse edildi', 'parseKMLTextAndShowOnMap');
        
        const placemarks = kmlDoc.getElementsByTagName('Placemark');
        if (!placemarks || placemarks.length === 0) {
            throw new Error('KML dosyasında Placemark bulunamadı');
        }
        
        logInfo(`${placemarks.length} Placemark bulundu`, 'parseKMLTextAndShowOnMap');
        
        // Clear existing data
        logInfo('Mevcut veriler temizleniyor...', 'parseKMLTextAndShowOnMap');
        // Note: resetMapData will be defined later, so we'll handle this differently
        logInfo('Mevcut veriler temizlendi', 'parseKMLTextAndShowOnMap');
        
        const locations = [];
        let validPlacemarks = 0;
        
        for (let i = 0; i < placemarks.length; i++) {
            try {
                const placemark = placemarks[i];
                
                // Get name and extract magnitude
                const nameElement = placemark.getElementsByTagName('name')[0];
                if (!nameElement) {
                    logWarning(`Placemark ${i}: name elementi bulunamadı`, 'parseKMLTextAndShowOnMap');
                    continue;
                }
                
                const name = nameElement.textContent.trim();
                const magnitudeMatch = name.match(/^([\d.]+)/);
                if (!magnitudeMatch) {
                    logWarning(`Placemark ${i}: magnitude bulunamadı: ${name}`, 'parseKMLTextAndShowOnMap');
                    continue;
                }
                
                const magnitude = parseFloat(magnitudeMatch[1]);
                
                // Get description and extract time
                const descriptionElement = placemark.getElementsByTagName('description')[0];
                if (!descriptionElement) {
                    logWarning(`Placemark ${i}: description elementi bulunamadı`, 'parseKMLTextAndShowOnMap');
                    continue;
                }
                
                const description = descriptionElement.textContent;
                const timeMatch = description.match(/Origin-Time:\s*(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/);
                if (!timeMatch) {
                    logWarning(`Placemark ${i}: zaman bilgisi bulunamadı`, 'parseKMLTextAndShowOnMap');
                    continue;
                }
                
                const timeStr = timeMatch[1];
                const timeParts = timeStr.match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
                if (!timeParts) {
                    logWarning(`Placemark ${i}: zaman formatı geçersiz: ${timeStr}`, 'parseKMLTextAndShowOnMap');
                    continue;
                }
                
                const [, year, month, day, hour, minute, second] = timeParts;
                
                const yearInt = parseInt(year);
                const monthInt = parseInt(month);
                const dayInt = parseInt(day);
                const hourInt = parseInt(hour);
                const minuteInt = parseInt(minute);
                const secondInt = parseInt(second);
                
                const date = new Date(yearInt, monthInt - 1, dayInt, hourInt, minuteInt, secondInt);
                
                if (isNaN(date.getTime())) {
                    logWarning(`Geçersiz tarih: ${timeStr}`, 'parseKMLTextAndShowOnMap');
                    continue;
                }
                
                const timestamp = date.getTime() / 1000;
                
                // Get coordinates
                const coordinatesElement = placemark.getElementsByTagName('coordinates')[0];
                if (!coordinatesElement) {
                    logWarning(`Placemark ${i}: coordinates elementi bulunamadı`, 'parseKMLTextAndShowOnMap');
                    continue;
                }
                
                const coords = coordinatesElement.textContent.trim().split(',');
                if (coords.length < 2) {
                    logWarning(`Placemark ${i}: yetersiz koordinat: ${coords.length}`, 'parseKMLTextAndShowOnMap');
                    continue;
                }
                
                const lng = parseFloat(coords[0]);
                const lat = parseFloat(coords[1]);
                
                if (isNaN(lng) || isNaN(lat)) {
                    logWarning(`Placemark ${i}: geçersiz koordinat: ${coords[0]}, ${coords[1]}`, 'parseKMLTextAndShowOnMap');
                    continue;
                }
                
                const location = {
                    id: `loc_${i}`,
                    name: name,
                    magnitude: magnitude,
                    lat: lat,
                    lng: lng,
                    timestamp: timestamp,
                    appearTime: timestamp
                };
                
                locations.push(location);
                validPlacemarks++;
                
            } catch (placemarkError) {
                logWarning(`Placemark ${i} parse hatası: ${placemarkError.message}`, 'parseKMLTextAndShowOnMap');
            }
        }
        
        logInfo(`${validPlacemarks} geçerli Placemark işlendi`, 'parseKMLTextAndShowOnMap');
        
        if (locations.length === 0) {
            throw new Error('Geçerli konum bulunamadı');
        }
        
        // Sort locations by time
        logInfo('Konumlar zamana göre sıralanıyor...', 'parseKMLTextAndShowOnMap');
        locations.sort((a, b) => a.timestamp - b.timestamp);
        
        // Store locations globally
        window.locations = locations;
        window.currentLocationIndex = 0;
        
        // Calculate time range
        const startTime = locations[0].timestamp;
        const endTime = locations[locations.length - 1].timestamp;
        const duration = endTime - startTime;
        
        window.startTimeSeconds = startTime;
        window.endTimeSeconds = endTime;
        window.duration = duration;
        window.currentTimeSeconds = startTime;
        
        logInfo(`Zaman aralığı: ${formatTurkishDate(startTime)} - ${formatTurkishDate(endTime)}`, 'parseKMLTextAndShowOnMap');
        
        // For now, just log success - we'll handle the rest in the main function
        logInfo(`KML parse tamamlandı: ${locations.length} konum`, 'parseKMLTextAndShowOnMap');
        
        // Return the parsed data instead of trying to update UI here
        return {
            locations: locations,
            startTime: startTime,
            endTime: endTime,
            duration: duration
        };
        
    } catch (error) {
        logError('KML parse hatası', error, 'parseKMLTextAndShowOnMap');
        showMessage(`KML dosyası işlenirken hata oluştu: ${error.message}`, true);
        throw error;
    }
};

// Default KML loading function
const loadDefaultKML = async () => {
    try {
        logInfo('Varsayılan KML dosyası yükleniyor...', 'loadDefaultKML');
        showMessage('Varsayılan KML dosyası yükleniyor...');
        
        const response = await fetch('./balikesir-sindirgi-10.08.25.kml');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const kmlText = await response.text();
        if (!kmlText || kmlText.trim().length === 0) {
            throw new Error('KML dosyası boş');
        }
        
        logInfo(`KML dosyası başarıyla yüklendi (${kmlText.length} karakter)`, 'loadDefaultKML');
        
        // Try to parse KML with detailed error handling
        try {
            const parsedData = parseKMLTextAndShowOnMap(kmlText, 'balikesir-sindirgi-10.08.25.kml');
            logInfo('KML parse başarılı, veriler hazırlanıyor...', 'loadDefaultKML');
            
            // Store the parsed data globally for later use
            window.parsedKMLData = parsedData;
            
            showMessage('KML dosyası başarıyla yüklendi. Veriler hazırlanıyor...', false);
            
        } catch (parseError) {
            logError('KML parse hatası', parseError, 'loadDefaultKML');
            throw new Error(`KML parse hatası: ${parseError.message}`);
        }
        
    } catch (error) {
        logError('Varsayılan KML yükleme hatası', error, 'loadDefaultKML');
        showMessage(`Varsayılan KML yüklenemedi: ${error.message}`, true);
        
        // Show modal again if default KML fails
        setTimeout(() => {
            const selectionModal = document.getElementById('selection-modal');
            if (selectionModal) {
                selectionModal.classList.remove('hidden');
            }
        }, 2000);
    }
};

// Selection Modal Functions
const initializeSelectionModal = () => {
    try {
        const defaultOption = document.getElementById('default-option');
        const customOption = document.getElementById('custom-option');
        const selectionModal = document.getElementById('selection-modal');
        
        // Option selection handlers
        defaultOption.addEventListener('click', () => {
            logInfo('Varsayılan seçenek seçildi', 'initializeSelectionModal');
            
            // Hide modal and load default KML
            selectionModal.classList.add('hidden');
            setTimeout(() => {
                loadDefaultKML();
            }, 300);
        });
        
        customOption.addEventListener('click', () => {
            logInfo('Özel dosya seçeneği seçildi', 'initializeSelectionModal');
            
            // Hide modal and open file upload sidebar
            selectionModal.classList.add('hidden');
            setTimeout(() => {
                const sidebar = document.getElementById('sidebar');
                const sidebarOverlay = document.getElementById('sidebar-overlay');
                if (sidebar) sidebar.classList.add('open');
                if (sidebarOverlay) sidebarOverlay.classList.add('active');
            }, 300);
        });
        
        logInfo('Seçim modal başlatıldı', 'initializeSelectionModal');
        
    } catch (error) {
        logError('Seçim modal başlatma hatası', error, 'initializeSelectionModal');
    }
};

// Info sidebar functions
const initializeInfoSidebar = () => {
    try {
        const projectTitle = document.getElementById('project-title');
        
        if (projectTitle) {
            projectTitle.addEventListener('click', toggleInfoSidebar);
        }
        
        const feedbackBtn = document.getElementById('feedback-btn');
        const closeFeedbackPopup = document.getElementById('close-feedback-popup');
        const cancelFeedback = document.getElementById('cancel-feedback');
        const feedbackForm = document.getElementById('feedback-form');
        
        if (feedbackBtn) {
            feedbackBtn.addEventListener('click', showFeedbackPopup);
        }
        
        if (closeFeedbackPopup) {
            closeFeedbackPopup.addEventListener('click', hideFeedbackPopup);
        }
        
        if (cancelFeedback) {
            cancelFeedback.addEventListener('click', hideFeedbackPopup);
        }
        
        if (feedbackForm) {
            feedbackForm.addEventListener('submit', handleFeedbackSubmit);
        }
        
        const copyLinkBtn = document.getElementById('copy-link-btn');
        const shareTwitterBtn = document.getElementById('share-twitter-btn');
        const shareFacebookBtn = document.getElementById('share-facebook-btn');
        
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', copyCurrentLink);
        }
        
        if (shareTwitterBtn) {
            shareTwitterBtn.addEventListener('click', shareOnTwitter);
        }
        
        if (shareFacebookBtn) {
            shareFacebookBtn.addEventListener('click', shareOnFacebook);
        }
        
        const infoSidebarOverlay = document.getElementById('info-sidebar-overlay');
        if (infoSidebarOverlay) {
            infoSidebarOverlay.addEventListener('click', () => {
                const infoSidebar = document.getElementById('info-sidebar');
                if (infoSidebar) {
                    infoSidebar.classList.remove('open');
                    infoSidebarOverlay.classList.remove('active');
                }
            });
        }
        
        logInfo('Bilgi sekmesi başlatıldı', 'initializeInfoSidebar');
        
    } catch (error) {
        logError('Bilgi sekmesi başlatma hatası', error, 'initializeInfoSidebar');
    }
};

const toggleInfoSidebar = () => {
    try {
        const infoSidebar = document.getElementById('info-sidebar');
        const infoSidebarOverlay = document.getElementById('info-sidebar-overlay');
        
        if (infoSidebar && infoSidebarOverlay) {
            const isOpen = infoSidebar.classList.contains('open');
            
            if (isOpen) {
                infoSidebar.classList.remove('open');
                infoSidebarOverlay.classList.remove('active');
            } else {
                infoSidebar.classList.add('open');
                infoSidebarOverlay.classList.add('active');
            }
            
            logInfo(`Bilgi sekmesi ${isOpen ? 'kapatıldı' : 'açıldı'}`, 'toggleInfoSidebar');
        }
        } catch (error) {
        logError('Bilgi sekmesi açma/kapama hatası', error, 'toggleInfoSidebar');
    }
};

const showFeedbackPopup = () => {
    try {
        const feedbackPopup = document.getElementById('feedback-popup');
        if (feedbackPopup) {
            feedbackPopup.classList.add('show');
        }
    } catch (error) {
        logError('Geri bildirim popup açma hatası', error, 'showFeedbackPopup');
    }
};

const hideFeedbackPopup = () => {
    try {
        const feedbackPopup = document.getElementById('feedback-popup');
        if (feedbackPopup) {
            feedbackPopup.classList.remove('show');
            const form = document.getElementById('feedback-form');
            if (form) form.reset();
        }
    } catch (error) {
        logError('Geri bildirim popup kapatma hatası', error, 'hideFeedbackPopup');
    }
};

const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    try {
        const formData = new FormData(e.target);
        
        // Formspree ile gönder
        fetch(e.target.action, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => {
            if (response.ok) {
                showMessage('Geri bildiriminiz için teşekkürler!', false);
                hideFeedbackPopup();
                } else {
                throw new Error('Formspree hatası');
            }
        })
        .catch(error => {
            logError('Formspree gönderme hatası', error, 'handleFeedbackSubmit');
            showMessage('Geri bildirim gönderilemedi. Lütfen tekrar deneyin.', true);
        });
        
    } catch (error) {
        logError('Geri bildirim kaydetme hatası', error, 'handleFeedbackSubmit');
        showMessage('Geri bildirim kaydedilemedi.', true);
    }
};

const copyCurrentLink = async () => {
    try {
        await navigator.clipboard.writeText('https://umutcantr.github.io/deprem-analizi');
        showMessage('Link kopyalandı!', false);
    } catch (error) {
        logError('Link kopyalama hatası', error, 'copyCurrentLink');
    }
};

const shareOnTwitter = () => {
    try {
        const text = '🌍 Deprem Analizi - Sismik verileri görselleştiren interaktif web uygulaması!';
        const url = 'https://umutcantr.github.io/deprem-analizi';
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        window.open(twitterUrl, '_blank');
    } catch (error) {
        logError('Twitter paylaşım hatası', error, 'shareOnTwitter');
    }
};

const shareOnFacebook = () => {
    try {
        const url = 'https://umutcantr.github.io/deprem-analizi';
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(facebookUrl, '_blank');
        } catch (error) {
        logError('Facebook paylaşım hatası', error, 'shareOnFacebook');
    }
};

document.addEventListener("DOMContentLoaded", () => {
    // Initialize selection modal first
    initializeSelectionModal();
    
    const map = L.map('map').setView([39.9334, 32.8597], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const timeline = document.getElementById('timeline');
    const timelineTimeLabel = document.getElementById('timeline-time-label');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const kmlInput = document.getElementById('kml-input');
    const loadKmlBtn = document.getElementById('load-kml-btn');
    const resetIcon = document.getElementById('reset-icon');
    const prevLocationBtn = document.getElementById('prev-location-btn');
    const nextLocationBtn = document.getElementById('next-location-btn');
    const speedSelect = document.getElementById('speed-select');

    let markers = {};
    let locations = [];
    let currentTimeSeconds = 0;
    let startTimeSeconds = 0;
    let endTimeSeconds = 0;
    let duration = 0;
    let currentLocationIndex = 0;

    // Initialize info sidebar
    initializeInfoSidebar();

    // Check if we have parsed KML data from the modal selection
    if (window.parsedKMLData) {
        logInfo('Parse edilen KML verisi bulundu, UI güncelleniyor...', 'DOMContentLoaded');
        
        try {
            // Extract data from parsed KML
            const { locations: parsedLocations, startTime, endTime, duration: parsedDuration } = window.parsedKMLData;
            
            // Store locations globally
            window.locations = parsedLocations;
            window.currentLocationIndex = 0;
            window.startTimeSeconds = startTime;
            window.endTimeSeconds = endTime;
            window.duration = parsedDuration;
            window.currentTimeSeconds = startTime;
            
            // Update UI
            updateTimeline();
            updateMapMarkers();
            fitMapToLocations(parsedLocations);
            
            showMessage(`Balıkesir KML: ${parsedLocations.length} konum yüklendi. Animasyon başlatılıyor...`);
            
            // Start animation after a short delay
            setTimeout(() => {
                try {
                    window.isAnimationPaused = false;
                    startAnimation();
                    if (playPauseBtn) { playPauseBtn.innerHTML = '⏸️'; }
                    logInfo('Animasyon otomatik başlatıldı', 'DOMContentLoaded');
                } catch (animationError) {
                    logError('Otomatik animasyon başlatma hatası', animationError, 'DOMContentLoaded');
                    showMessage('Animasyon başlatılamadı, manuel olarak başlatabilirsiniz.', true);
                }
            }, 1000);
            
            // Clear the parsed data
            delete window.parsedKMLData;
            
        } catch (error) {
            logError('Parse edilen veri ile UI güncelleme hatası', error, 'DOMContentLoaded');
        }
    }

    // KML parsing function
    // This function is now defined above and called from loadDefaultKML

    // Map fit function
    const fitMapToLocations = (locations) => {
        try {
            if (!locations || locations.length === 0) return;
            
            const bounds = L.latLngBounds();
            locations.forEach(loc => {
                bounds.extend([loc.lat, loc.lng]);
            });
            
            map.fitBounds(bounds, { padding: [20, 20] });
            logInfo('Harita konumlara göre ayarlandı', 'fitMapToLocations');
            
        } catch (error) {
            logError('Harita ayarlama hatası', error, 'fitMapToLocations');
        }
    };

    // Animation functions
    const startAnimation = () => {
        try {
            if (window.animationInterval) {
                clearInterval(window.animationInterval);
            }
            
            window.isAnimationPaused = false;
            // Don't reset currentTimeSeconds - keep it at current position
            
                         // 1x hızında 15 dakika = 900 saniye, her saniye 900 saniye ilerler
             // 3x hızında 45 dakika = 2700 saniye, her saniye 2700 saniye ilerler
             // 9x hızında 135 dakika = 8100 saniye, her saniye 8100 saniye ilerler
             const timeStep = 900 * window.animationSpeed;
             const intervalTime = 1000; // Update every 1 second
            
            window.animationInterval = setInterval(() => {
                if (!window.isAnimationPaused) {
                    updateAnimation(timeStep);
                }
            }, intervalTime);
            
            logInfo('Animasyon başlatıldı', 'startAnimation');
            
        } catch (error) {
            logError('Animasyon başlatma hatası', error, 'startAnimation');
        }
    };

    const pauseAnimation = () => {
        try {
            window.isAnimationPaused = true;
            if (window.animationInterval) {
                clearInterval(window.animationInterval);
                window.animationInterval = null;
            }
            logInfo('Animasyon duraklatıldı', 'pauseAnimation');
        } catch (error) {
            logError('Animasyon duraklatma hatası', error, 'pauseAnimation');
        }
    };

    const resumeAnimation = () => {
        try {
            window.isAnimationPaused = false;
            startAnimation();
            logInfo('Animasyon devam ettirildi', 'resumeAnimation');
        } catch (error) {
            logError('Animasyon devam ettirme hatası', error, 'resumeAnimation');
        }
    };

    const updateAnimation = (timeStep) => {
        try {
            // Advance time by timeStep
            window.currentTimeSeconds += timeStep;
            
            // Check if animation is finished
            if (window.currentTimeSeconds >= window.endTimeSeconds) {
                window.currentTimeSeconds = window.endTimeSeconds;
                pauseAnimation();
                if (playPauseBtn) playPauseBtn.innerHTML = '▶️';
                logInfo('Animasyon tamamlandı', 'updateAnimation');
                return;
            }
            
            // Update timeline
            updateTimeline();
            
            // Update map markers based on current time
            updateMapMarkers();
            
        } catch (error) {
            logError('Animasyon güncelleme hatası', error, 'updateAnimation');
        }
    };

    const updateMapMarkers = () => {
        try {
            const currentTime = window.currentTimeSeconds;
            
            // Clear existing markers
            Object.values(markers).forEach(marker => marker.remove());
            markers = {};
            
            // Show all locations that have appeared by current time
            window.locations.forEach(loc => {
                if (loc.timestamp <= currentTime) {
                    const style = getMarkerStyle(loc.magnitude);
                    const marker = L.circleMarker([loc.lat, loc.lng], {
                        radius: style.radius,
                        color: style.color,
                        fillOpacity: 0.7
                    }).addTo(map);

                    marker.bindPopup(`<b>${loc.name}</b><br>Büyüklük: ${loc.magnitude}<br>Zaman: ${formatTurkishDate(loc.timestamp)}`);
                    markers[loc.id] = marker;
                    
                                         // Show popup for newly appeared locations (within last 5 seconds)
                     if (loc.timestamp >= currentTime - 5 && window.animationSpeed !== 9) {
                        setTimeout(() => {
                            marker.openPopup();
                            
                                                     let popupDuration;
                         switch (window.animationSpeed) {
                             case 0.5: popupDuration = 2000; break;
                             case 1: popupDuration = 1000; break;
                             case 3: popupDuration = 500; break;
                             case 9: popupDuration = 250; break;
                             default: popupDuration = 1000;
                         }
                            
                            setTimeout(() => {
                                marker.closePopup();
                            }, popupDuration);
                            
                        }, 100);
                    }
                }
            });
            
        } catch (error) {
            logError('Harita marker güncelleme hatası', error, 'updateMapMarkers');
        }
    };

    const updateTimeline = () => {
        try {
            if (!timeline || !timelineTimeLabel) return;
            
            // Calculate progress based on current time
            const progress = window.duration > 0 ? (window.currentTimeSeconds - window.startTimeSeconds) / window.duration : 0;
            const cursor = document.getElementById('timeline-cursor');
            
            if (cursor) {
                cursor.style.left = `${progress * 100}%`;
            }
            
            if (timelineTimeLabel) {
                timelineTimeLabel.textContent = formatTurkishDate(window.currentTimeSeconds);
            }
            
            // Update timeline markers for earthquake locations
            updateTimelineMarkers();
            
            // Update navigation buttons
            updateNavigationButtons();
            
        } catch (error) {
            logError('Timeline güncelleme hatası', error, 'updateTimeline');
        }
    };

    const updateTimelineMarkers = () => {
        try {
            // Clear existing timeline markers
            const existingMarkers = document.querySelectorAll('.timeline-marker');
            existingMarkers.forEach(marker => marker.remove());
            
            // Add markers for each earthquake location
            window.locations.forEach(loc => {
                const progress = window.duration > 0 ? (loc.timestamp - window.startTimeSeconds) / window.duration : 0;
                
                const marker = document.createElement('div');
                marker.className = 'timeline-marker';
                marker.style.cssText = `
                    position: absolute;
                    left: ${progress * 100}%;
                    top: -5px;
                    width: 10px;
                    height: 10px;
                    background: ${getMarkerStyle(loc.magnitude).color};
                    border-radius: 50%;
                    border: 2px solid white;
                    cursor: pointer;
                    z-index: 10;
                    transform: translateX(-50%);
                `;
                
                marker.title = `${loc.name} - ${formatTurkishDate(loc.timestamp)}`;
                
                marker.addEventListener('click', () => {
                    window.currentTimeSeconds = loc.timestamp;
                    updateTimeline();
                    updateMapMarkers();
                });
                
                timeline.appendChild(marker);
            });
            
        } catch (error) {
            logError('Timeline marker güncelleme hatası', error, 'updateTimelineMarkers');
        }
    };

    const getMarkerStyle = (magnitude) => {
        try {
            if (magnitude >= 6.0) {
                return { radius: 12, color: '#ff0000' };
            } else if (magnitude >= 5.0) {
                return { radius: 10, color: '#ff6600' };
            } else if (magnitude >= 4.0) {
                return { radius: 8, color: '#ffcc00' };
            } else if (magnitude >= 3.0) {
                return { radius: 6, color: '#00cc00' };
            } else {
                return { radius: 4, color: '#0066cc' };
            }
        } catch (error) {
            logError('Marker stil hatası', error, 'getMarkerStyle');
            return { radius: 6, color: '#999999' };
        }
    };

    const resetMapData = () => {
        try {
            // Clear markers
            Object.values(markers).forEach(marker => marker.remove());
            markers = {};
            
            // Reset variables
            window.locations = [];
            window.currentTimeSeconds = 0;
            window.startTimeSeconds = 0;
            window.endTimeSeconds = 0;
            window.duration = 0;
            window.currentLocationIndex = 0;
            
            // Stop animation
            if (window.animationInterval) {
                clearInterval(window.animationInterval);
                window.animationInterval = null;
            }
            
            window.isAnimationPaused = true;
            
            // Clear timeline display
            if (timelineTimeLabel) {
                timelineTimeLabel.textContent = '';
            }
            
            // Clear timeline cursor
            const cursor = document.getElementById('timeline-cursor');
            if (cursor) {
                cursor.style.left = '0%';
            }
            
            // Clear timeline markers
            const existingMarkers = document.querySelectorAll('.timeline-marker');
            existingMarkers.forEach(marker => marker.remove());
            
            // Reset buttons
            if (playPauseBtn) playPauseBtn.innerHTML = '▶️';
            
            // Show success message
            showMessage('Geçerli KML verileri temizlendi.');
            
            logInfo('Harita verileri sıfırlandı', 'resetMapData');
            
        } catch (error) {
            logError('Harita sıfırlama hatası', error, 'resetMapData');
        }
    };

    // Location view functions
    const updateLocationView = (newIndex) => {
        try {
            if (newIndex < 0 || newIndex >= window.locations.length) return;
            
            window.currentLocationIndex = newIndex;
            const location = window.locations[newIndex];
            
            // Set current time to this location's timestamp
            window.currentTimeSeconds = location.timestamp;
            
            // Update timeline and map
            updateTimeline();
            updateMapMarkers();
            
            showMessage(`Konum ${newIndex + 1}/${window.locations.length}: ${location.name}`);
            updateNavigationButtons();
            logInfo(`Konum güncellendi: ${newIndex + 1}/${window.locations.length}`, 'updateLocationView');
            
                } catch (error) {
            logError('Konum güncelleme hatası', error, 'updateLocationView');
        }
    };

    // Navigation Functions
    const goToPreviousLocation = () => {
        if (window.locations.length === 0) return;
        
        // Find the previous location that has appeared before current time
        let targetTime = window.currentTimeSeconds - 900; // Go back 15 minutes
        let targetLocation = null;
        
        for (let i = window.locations.length - 1; i >= 0; i--) {
            if (window.locations[i].timestamp <= targetTime) {
                targetLocation = window.locations[i];
                break;
            }
        }
        
        if (targetLocation) {
            window.currentTimeSeconds = targetLocation.timestamp;
            updateTimeline();
            updateMapMarkers();
            showMessage(`Geri gidildi: ${formatTurkishDate(targetLocation.timestamp)}`);
        } else {
            // If no previous location found, go to the first location
            window.currentTimeSeconds = window.startTimeSeconds;
            updateTimeline();
            updateMapMarkers();
            showMessage('Başlangıca dönüldü');
        }
    };

    const goToNextLocation = () => {
        if (window.locations.length === 0) return;
        
        // Find the next location that appears after current time
        let targetTime = window.currentTimeSeconds + 900; // Go forward 15 minutes
        let targetLocation = null;
        
        for (let i = 0; i < window.locations.length; i++) {
            if (window.locations[i].timestamp > window.currentTimeSeconds) {
                targetLocation = window.locations[i];
                break;
            }
        }
        
        if (targetLocation) {
            window.currentTimeSeconds = targetLocation.timestamp;
            updateTimeline();
            updateMapMarkers();
            showMessage(`İleri gidildi: ${formatTurkishDate(targetLocation.timestamp)}`);
        } else {
            // If no next location found, go to the last location
            window.currentTimeSeconds = window.endTimeSeconds;
            updateTimeline();
            updateMapMarkers();
            showMessage('Sona gidildi');
        }
    };

    const updateNavigationButtons = () => {
        if (window.locations.length === 0) {
            prevLocationBtn.disabled = true;
            nextLocationBtn.disabled = true;
            return;
        }
        
        // Check if we can go back (not at the beginning)
        const canGoBack = window.currentTimeSeconds > window.startTimeSeconds;
        prevLocationBtn.disabled = !canGoBack;
        
        // Check if we can go forward (not at the end)
        const canGoForward = window.currentTimeSeconds < window.endTimeSeconds;
        nextLocationBtn.disabled = !canGoForward;
    };

    // Speed Control Functions
    const updateAnimationSpeed = () => {
        const wasPaused = window.isAnimationPaused;
        const currentTime = window.currentTimeSeconds;
        
        window.animationSpeed = parseFloat(speedSelect.value);
        
        if (!wasPaused) {
            // Restart animation from current time
            window.currentTimeSeconds = currentTime;
            startAnimation();
        }
        
        showMessage(`Animasyon hızı: ${window.animationSpeed}x`);
    };

    // Event Listeners
    playPauseBtn.addEventListener('click', () => {
        window.isAnimationPaused ? resumeAnimation() : pauseAnimation();
    });
    
    // Timeline click event
    timeline.addEventListener('click', (e) => {
        try {
            const rect = timeline.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickPercent = clickX / rect.width;
            
            // Calculate new time based on click position
            const newTime = window.startTimeSeconds + (clickPercent * window.duration);
            
            // Ensure time is within bounds
            const clampedTime = Math.max(window.startTimeSeconds, Math.min(window.endTimeSeconds, newTime));
            
            window.currentTimeSeconds = clampedTime;
            updateTimeline();
            updateMapMarkers();
            
            logInfo(`Timeline'a tıklandı: ${formatTurkishDate(clampedTime)}`, 'TIMELINE_CLICK');
            
        } catch (error) {
            logError('Timeline tıklama hatası', error, 'TIMELINE_CLICK');
        }
    });

    resetIcon.addEventListener('click', resetMapData);

    loadKmlBtn.addEventListener('click', () => {
        try {
            if (!kmlInput || !kmlInput.files) {
                throw new Error('Dosya input elementi bulunamadı');
            }
            
            if (kmlInput.files.length === 0) {
                showMessage('Lütfen bir KML dosyası seçin.', true);
                return;
            }
            
            const file = kmlInput.files[0];
            
            if (!file.name.toLowerCase().endsWith('.kml')) {
                throw new Error('Sadece KML dosyaları desteklenir');
            }
            
            if (file.size > 10 * 1024 * 1024) {
                throw new Error('Dosya boyutu çok büyük (maksimum 10MB)');
            }
            
            logInfo(`KML dosyası yükleniyor: ${file.name} (${file.size} bytes)`, 'KML_LOAD');
            
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    if (!e.target || !e.target.result) {
                        throw new Error('Dosya okuma sonucu bulunamadı');
                    }
                    
                    const kmlText = e.target.result;
                    if (!kmlText || typeof kmlText !== 'string') {
                        throw new Error('Geçersiz dosya içeriği');
                    }
                    
                    logInfo(`KML dosyası başarıyla okundu: ${kmlText.length} karakter`, 'KML_LOAD');
                    parseKMLTextAndShowOnMap(kmlText, file.name);
                    
                    // KML dosyası başarıyla yüklendiyse sidebar'ı kapat
                    const sidebar = document.getElementById('sidebar');
                    const sidebarOverlay = document.getElementById('sidebar-overlay');
                    
                    if (sidebar) sidebar.classList.remove('open');
                    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
                    
                } catch (parseError) {
                    logError('KML parse hatası', parseError, 'KML_LOAD');
                    showMessage(`KML dosyası işlenirken hata oluştu: ${parseError.message}`, true);
                }
            };
            
            reader.onerror = (e) => {
                const error = new Error('Dosya okunamadı');
                logError('Dosya okuma hatası', error, 'KML_LOAD');
                showMessage('Dosya okunamadı.', true);
                };
                
                reader.readAsText(file);
            
        } catch (error) {
            logError('KML yükleme hatası', error, 'KML_LOAD');
            showMessage(`KML yükleme hatası: ${error.message}`, true);
        }
    });

    kmlInput.addEventListener('change', () => {
        try {
            if (!kmlInput || !kmlInput.files) {
                logError('Dosya input elementi bulunamadı', null, 'FILE_INPUT_CHANGE');
                return;
            }
            
            const fileStatusText = document.getElementById('file-status-text');
            if (!fileStatusText) {
                logWarning('File status text elementi bulunamadı', 'FILE_INPUT_CHANGE');
                    return;
            }
            
            if (kmlInput.files.length > 0) {
                const file = kmlInput.files[0];
                fileStatusText.textContent = `${kmlInput.files.length} dosya seçildi: ${file.name}`;
                logInfo(`Dosya seçildi: ${file.name} (${file.size} bytes)`, 'FILE_INPUT_CHANGE');
                } else {
                fileStatusText.textContent = 'Dosya seçilmedi';
                logInfo('Dosya seçimi temizlendi', 'FILE_INPUT_CHANGE');
                }
            } catch (error) {
            logError('Dosya input değişiklik hatası', error, 'FILE_INPUT_CHANGE');
        }
    });

    // Navigation event listeners
    prevLocationBtn.addEventListener('click', goToPreviousLocation);
    nextLocationBtn.addEventListener('click', goToNextLocation);

    // Speed control event listener
    speedSelect.addEventListener('change', updateAnimationSpeed);

    document.getElementById('file-upload-icon').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('sidebar-overlay').classList.toggle('active');
    });
    
    document.getElementById('sidebar-overlay').addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('active');
    });
    
    // Global error handlers
    window.addEventListener('error', (event) => {
        logError('Global JavaScript hatası', event.error, 'GLOBAL_ERROR');
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        logError('İşlenmeyen Promise hatası', event.reason, 'UNHANDLED_PROMISE');
    });
    
    // Performance monitoring
    const startTime = performance.now();
    window.addEventListener('load', () => {
        const loadTime = performance.now() - startTime;
        logInfo(`Sayfa yükleme süresi: ${loadTime.toFixed(2)}ms`, 'PERFORMANCE');
    });
    
    // Note: loadDefaultKML() is now called from the modal selection
    // instead of automatically on page load
});
