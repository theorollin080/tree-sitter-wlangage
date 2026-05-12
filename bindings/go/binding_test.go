package tree_sitter_wlangage_test

import (
	"testing"

	tree_sitter "github.com/smacker/go-tree-sitter"
	"github.com/tree-sitter/tree-sitter-wlangage"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_wlangage.Language())
	if language == nil {
		t.Errorf("Error loading Wlangage grammar")
	}
}
