//go:build ignore

// textcolor.go img x,y,w,h ... : the foreground colour of text in each region = average of the 4% of pixels farthest from the region's background (its mode).
package main

import (
	"fmt"
	"image"
	_ "image/png"
	"os"
	"sort"
	"strconv"
	"strings"
)

func main() {
	f, _ := os.Open(os.Args[1])
	img, _, err := image.Decode(f)
	if err != nil {
		panic(err)
	}
	for _, a := range os.Args[2:] {
		p := strings.Split(a, ",")
		n := make([]int, 4)
		for i := range n {
			n[i], _ = strconv.Atoi(p[i])
		}
		type px struct{ r, g, b int }
		var all []px
		cnt := map[px]int{}
		for y := n[1]; y < n[1]+n[3]; y++ {
			for x := n[0]; x < n[0]+n[2]; x++ {
				r, g, b, _ := img.At(x, y).RGBA()
				q := px{int(r >> 8), int(g >> 8), int(b >> 8)}
				all = append(all, q)
				cnt[q]++
			}
		}
		var bg px
		best := 0
		for k, v := range cnt {
			if v > best {
				best, bg = v, k
			}
		}
		d := func(q px) int {
			a, b, c := q.r-bg.r, q.g-bg.g, q.b-bg.b
			return a*a + b*b + c*c
		}
		sort.Slice(all, func(i, j int) bool { return d(all[i]) > d(all[j]) })
		k := len(all) / 25
		if k < 1 {
			k = 1
		}
		var sr, sg, sb int
		for _, q := range all[:k] {
			sr += q.r
			sg += q.g
			sb += q.b
		}
		fmt.Printf("%-18s bg #%02x%02x%02x  text #%02x%02x%02x\n", a, bg.r, bg.g, bg.b, sr/k, sg/k, sb/k)
	}
}
