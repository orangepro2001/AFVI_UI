package inventory

import (
	"errors"
	"sync"
	"testing"
)

func TestLazyReturnsSameService(t *testing.T) {
	lazy := NewLazy(func() (string, error) { return "testdata/PxInventory", nil })

	first, err := lazy.Service()
	if err != nil {
		t.Fatalf("Service() error: %v", err)
	}
	second, err := lazy.Service()
	if err != nil {
		t.Fatalf("Service() second call error: %v", err)
	}
	if first != second {
		t.Errorf("Service() returned different services: %p != %p", first, second)
	}
}

func TestLazyRetriesAfterFailure(t *testing.T) {
	calls := 0
	lazy := NewLazy(func() (string, error) {
		calls++
		if calls == 1 {
			return "", ErrNotFound
		}
		return "testdata/PxInventory", nil
	})

	if _, err := lazy.Service(); !errors.Is(err, ErrNotFound) {
		t.Fatalf("Service() error = %v, want ErrNotFound", err)
	}
	svc, err := lazy.Service()
	if err != nil {
		t.Fatalf("Service() second call error: %v", err)
	}
	if svc == nil {
		t.Fatal("Service() second call returned nil")
	}
}

func TestLazyConcurrentOpenOnce(t *testing.T) {
	var mu sync.Mutex
	opens := 0
	lazy := NewLazy(func() (string, error) {
		mu.Lock()
		opens++
		mu.Unlock()
		return "testdata/PxInventory", nil
	})

	const goroutines = 16
	results := make([]*Service, goroutines)
	errs := make([]error, goroutines)
	var wg sync.WaitGroup
	wg.Add(goroutines)
	for i := 0; i < goroutines; i++ {
		go func(i int) {
			defer wg.Done()
			results[i], errs[i] = lazy.Service()
		}(i)
	}
	wg.Wait()

	mu.Lock()
	defer mu.Unlock()
	if opens != 1 {
		t.Errorf("discover called %d times, want 1", opens)
	}
	for i := 0; i < goroutines; i++ {
		if errs[i] != nil {
			t.Fatalf("goroutine %d: Service() error: %v", i, errs[i])
		}
		if results[i] != results[0] {
			t.Fatalf("goroutine %d: got a different service", i)
		}
	}
}
