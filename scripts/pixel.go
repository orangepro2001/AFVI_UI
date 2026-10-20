//go:build ignore

// pixel.go - read colours out of a design image (docs/UI_WORKFLOW.md, "Sampling colours").
//
//	go run scripts/pixel.go <image.png> <x,y | x,y,w,h | x,y,w,h,n>...
//
// x,y prints the colour of that pixel. x,y,w,h prints the colour that covers most of the
// rectangle (the fill of a panel, not its anti-aliased edge) and how much of it that is, then the
// next most common ones (n sets how many are listed, default 3: text colours need more, because
// the fill of the background takes the first places). Coordinates are in image pixels, the origin is the top left corner.
// Only the Go standard library; PNG, JPEG and GIF are understood.
package main

import (
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"os"
	"sort"
	"strconv"
	"strings"
)

func hex(img image.Image, x, y int) string {
	r, g, b, _ := img.At(x, y).RGBA()
	return fmt.Sprintf("#%02x%02x%02x", r>>8, g>>8, b>>8)
}

func parse(arg string) ([]int, error) {
	parts := strings.Split(arg, ",")
	if len(parts) != 2 && len(parts) != 4 && len(parts) != 5 {
		return nil, fmt.Errorf("%q: expected x,y or x,y,w,h or x,y,w,h,n", arg)
	}
	nums := make([]int, len(parts))
	for i, p := range parts {
		n, err := strconv.Atoi(strings.TrimSpace(p))
		if err != nil || n < 0 {
			return nil, fmt.Errorf("%q: %q is not a pixel number", arg, p)
		}
		nums[i] = n
	}
	return nums, nil
}

func main() {
	if len(os.Args) < 3 {
		fmt.Fprintln(os.Stderr, "usage: go run scripts/pixel.go <image> <x,y | x,y,w,h>...")
		os.Exit(2)
	}
	file, err := os.Open(os.Args[1])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer file.Close()
	img, _, err := image.Decode(file)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s: %v\n", os.Args[1], err)
		os.Exit(1)
	}
	bounds := img.Bounds()
	fmt.Printf("%s: %dx%d\n", os.Args[1], bounds.Dx(), bounds.Dy())

	failed := false
	for _, arg := range os.Args[2:] {
		nums, err := parse(arg)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			failed = true
			continue
		}
		x, y := bounds.Min.X+nums[0], bounds.Min.Y+nums[1]
		show := 3
		if len(nums) == 5 {
			show = nums[4]
		}
		if len(nums) == 2 {
			if !(image.Point{X: x, Y: y}).In(bounds) {
				fmt.Fprintf(os.Stderr, "%s: outside the image\n", arg)
				failed = true
				continue
			}
			fmt.Printf("%-14s %s\n", arg, hex(img, x, y))
			continue
		}
		rect := image.Rect(x, y, x+nums[2], y+nums[3]).Intersect(bounds)
		if rect.Empty() {
			fmt.Fprintf(os.Stderr, "%s: outside the image\n", arg)
			failed = true
			continue
		}
		counts := map[string]int{}
		for py := rect.Min.Y; py < rect.Max.Y; py++ {
			for px := rect.Min.X; px < rect.Max.X; px++ {
				counts[hex(img, px, py)]++
			}
		}
		colours := make([]string, 0, len(counts))
		for c := range counts {
			colours = append(colours, c)
		}
		sort.Slice(colours, func(i, j int) bool {
			if counts[colours[i]] != counts[colours[j]] {
				return counts[colours[i]] > counts[colours[j]]
			}
			return colours[i] < colours[j]
		})
		total := rect.Dx() * rect.Dy()
		for i, c := range colours {
			if i == show {
				break
			}
			label := ""
			if i == 0 {
				label = arg
			}
			fmt.Printf("%-14s %s  %5.1f%%\n", label, c, 100*float64(counts[c])/float64(total))
		}
	}
	if failed {
		os.Exit(1)
	}
}
