import { h, Fragment } from "preact";
import { SectionHeader, CommentCard, NotificationCard, GroupedRepositoryCard } from "./components.js";
export function ExamplesApp() {
  return /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h(SectionHeader, { id: "form", title: "\u958B\u9589\u3059\u308Bform" }), /* @__PURE__ */ h("article", null, /* @__PURE__ */ h("details", null, /* @__PURE__ */ h("summary", { role: "button" }, "title"), /* @__PURE__ */ h("label", null, "search", /* @__PURE__ */ h("input", { type: "search" })), /* @__PURE__ */ h("button", null, "Submit!"))), /* @__PURE__ */ h(SectionHeader, { id: "loading", title: "button with loading" }), /* @__PURE__ */ h("article", null, /* @__PURE__ */ h("button", { class: "secondary", "aria-busy": "true" }, "button with loading"), /* @__PURE__ */ h("button", { class: "secondary", "aria-busy": "false" }, "button without loading")), /* @__PURE__ */ h(SectionHeader, { id: "notification-1", title: "\u30B3\u30E1\u30F3\u30C8\u304C\u306A\u3044notification" }), /* @__PURE__ */ h(
    NotificationCard,
    {
      title: "ocaml/ocaml",
      typ: "PullRequest",
      link: { "href": "https://github.com/ocaml/ocaml/pull/12679", "text": "#12679" },
      message: {
        author: { name: "", url: "https://avatars.githubusercontent.com/u/12210540?s=60&v=4" },
        cdate: "4 days ago",
        text: 'clarify meaning of "non-path module type"'
      }
    },
    /* @__PURE__ */ h("p", { style: { "white-space": "pre-wrap", "padding-right": "1rem" } }, "oooooooooooooooooooooooooooooooooooooooo")
  ), /* @__PURE__ */ h(SectionHeader, { id: "notification-2", title: "\u30B3\u30E1\u30F3\u30C8\u304C\u3042\u308Bnotification" }), /* @__PURE__ */ h(
    NotificationCard,
    {
      title: "ocaml/ocaml",
      typ: "PullRequest",
      link: { "href": "https://github.com/ocaml/ocaml/pull/12679", "text": "#12679" },
      message: {
        author: { name: "", url: "https://avatars.githubusercontent.com/u/12210540?s=60&v=4" },
        cdate: "4 days ago",
        text: 'clarify meaning of "non-path module type"'
      }
    },
    /* @__PURE__ */ h(
      CommentCard,
      {
        message: {
          author: { name: "smuenzel", url: "https://avatars.githubusercontent.com/u/12210540?s=60&v=4" },
          cdate: "4 days ago",
          text: 'The error produced when we do the following:\r\n```ocaml\r\nmodule type fst = sig\r\n  module type t := sig end\r\n  val x: (module t)\r\nend\r\n```\r\nuses the term "non-path module type", which is not defined in the manual. This PR replaces it with "a module type which does not have a name", which I think is equivalent, and should be more understandable to those who are not as familiar with module types.\r\n\r\nI don\'t believe this needs a changes entry, since it\'s just a small wording change.'
        }
      }
    ),
    /* @__PURE__ */ h(
      CommentCard,
      {
        message: {
          author: { name: "gasche", url: "https://avatars.githubusercontent.com/u/426238?s=60&v=4" },
          cdate: "4 days ago",
          text: 'Technically users may not understand that `F(X).T` counts as a "name". Also, in your example, it is not clear why `t` does not have a name -- its name is `t`, right?\r\n\r\nI think you have a good sense of the issue but I am not sure that your proposed change is really an improvement. Should we maybe consider writing a more detailed explanation somewhere in the manual, and linking to this in the error message?'
        }
      }
    ),
    /* @__PURE__ */ h(
      CommentCard,
      {
        message: {
          author: { name: "smuenzel", url: "https://avatars.githubusercontent.com/u/12210540?s=60&v=4" },
          cdate: "4 days ago",
          text: 'Here\'s a possible way of improving it:\r\n\r\n1) Change the wording in the manual at section 12.7.3 to include the syntactic definition of the path\r\n>If the right hand side of the substitution is not a @modtype-path@,\r\n>then the destructive substitution is only valid if the left-hand side of the\r\n>substitution is never used as the type of a first-class module in the original\r\n>module type.\r\n\r\n2) Change the wording of the error message to refer to the destructive substitution (to show that `t` is not available for naming in the final module type). Maybe:\r\n```\r\n Error: The module type "t" is not a valid type for a packed module:\r\n        destructive substitution of "t" is not possible since the resulting\r\n        packed module type cannot be named using a module type\r\n        path. (see manual section 12.7.3)\r\n```\r\n\r\n\r\nI guess this error message is more "correct", not sure if it\'s actually more helpful.\r\n'
        }
      }
    )
  ), /* @__PURE__ */ h(SectionHeader, { id: "grouped", title: "repository\u3067\u30B0\u30EB\u30FC\u30D4\u30F3\u30B0\u3055\u308C\u305Fnotification" }), /* @__PURE__ */ h(
    GroupedRepositoryCard,
    {
      author: { name: "ocaml/ocaml", url: "https://avatars.githubusercontent.com/u/1841483?v=4&s=80" }
    },
    /* @__PURE__ */ h(
      NotificationCard,
      {
        title: "ocaml/ocaml",
        typ: "PullRequest",
        link: { "href": "https://github.com/ocaml/ocaml/pull/12679", "text": "#12679" },
        message: {
          author: { name: "", url: "https://avatars.githubusercontent.com/u/12210540?s=60&v=4" },
          cdate: "4 days ago",
          text: 'clarify meaning of "non-path module type"'
        }
      },
      /* @__PURE__ */ h("p", { style: { "white-space": "pre-wrap", "padding-right": "1rem" } }, "oooooooooooooooooooooooooooooooooooooooo")
    ),
    /* @__PURE__ */ h(
      NotificationCard,
      {
        title: "ocaml/ocaml",
        typ: "PullRequest",
        link: { "href": "https://github.com/ocaml/ocaml/pull/12679", "text": "#12679" },
        message: {
          author: { name: "", url: "https://avatars.githubusercontent.com/u/12210540?s=60&v=4" },
          cdate: "4 days ago",
          text: 'clarify meaning of "non-path module type"'
        }
      },
      /* @__PURE__ */ h(
        CommentCard,
        {
          message: {
            author: { name: "smuenzel", url: "https://avatars.githubusercontent.com/u/12210540?s=60&v=4" },
            cdate: "4 days ago",
            text: "hello world"
          }
        }
      ),
      /* @__PURE__ */ h(
        CommentCard,
        {
          message: {
            author: { name: "gasche", url: "https://avatars.githubusercontent.com/u/426238?s=60&v=4" },
            cdate: "4 days ago",
            text: "byebye world"
          }
        }
      )
    )
  ));
}
