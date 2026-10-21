package inventory

import "sync"

// Lazy opens the Service on first use. A failed attempt is not remembered: the next call tries again,
// so that data which shows up later (a mounted share, a copied folder) is picked up.
type Lazy struct {
	mu       sync.Mutex
	discover func() (string, error)
	svc      *Service
}

// NewLazy returns a Lazy that opens the directory returned by discover.
func NewLazy(discover func() (string, error)) *Lazy {
	return &Lazy{discover: discover}
}

// Service returns the open Service, opening it with Open(discover()) when there is none yet.
func (l *Lazy) Service() (*Service, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.svc != nil {
		return l.svc, nil
	}
	dir, err := l.discover()
	if err != nil {
		return nil, err
	}
	svc, err := Open(dir)
	if err != nil {
		return nil, err
	}
	l.svc = svc
	return svc, nil
}
