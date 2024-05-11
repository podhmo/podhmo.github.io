package main

import "sort"
import "fmt"
import "github.com/kyokomi/emoji/v2"

func main(){
	m := emoji.CodeMap()
	names := make([]string, 0, len(m))
	for name := range m {
		names = append(names, name)
	}
	sort.Strings(names)

	fmt.Println("# emoji-list")
	fmt.Println("")
	fmt.Println("")
	fmt.Println("|char|input|")
	fmt.Println("|:--|:--|")
	for _, name := range names {
		fmt.Printf("|%s|%s|\n", m[name], name)
	}
}