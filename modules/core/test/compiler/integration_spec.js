import {describe, xit, it, expect, beforeEach, ddescribe, iit} from 'test_lib/test_lib';

import {DOM} from 'facade/dom';

import {Injector} from 'di/di';
import {ChangeDetector} from 'change_detection/change_detector';
import {Parser} from 'change_detection/parser/parser';
import {ClosureMap} from 'change_detection/parser/closure_map';
import {Lexer} from 'change_detection/parser/lexer';

import {Compiler} from 'core/compiler/compiler';
import {Reflector} from 'core/compiler/reflector';

import {Component} from 'core/annotations/component';
import {Decorator} from 'core/annotations/decorator';
import {TemplateConfig} from 'core/annotations/template_config';

export function main() {
  describe('integration tests', function() {
    var compiler;

    beforeEach( () => {
      var closureMap = new ClosureMap();
      compiler = new Compiler(null, new Reflector(), new Parser(new Lexer(), closureMap), closureMap);
    });

    describe('react to record changes', function() {
      var view, ctx, cd;
      function createView(pv) {
        ctx = new MyComp();
        view = pv.instantiate(ctx, new Injector([]), null);
        cd = new ChangeDetector(view.recordRange);
      }

      it('should consume text node changes', (done) => {
        compiler.compile(MyComp, createElement('<div>{{ctxProp}}</div>')).then((pv) => {
          createView(pv);
          ctx.ctxProp = 'Hello World!';

          cd.detectChanges();
          expect(DOM.getInnerHTML(view.nodes[0])).toEqual('Hello World!');
          done();
        });
      });

      it('should consume element binding changes', (done) => {
        compiler.compile(MyComp, createElement('<div [id]="ctxProp"></div>')).then((pv) => {
          createView(pv);

          ctx.ctxProp = 'Hello World!';
          cd.detectChanges();

          expect(view.nodes[0].id).toEqual('Hello World!');
          done();
        });
      });

      it('should consume directive watch expression change.', (done) => {
        compiler.compile(MyComp, createElement('<div my-dir [elprop]="ctxProp"></div>')).then((pv) => {
          createView(pv);

          ctx.ctxProp = 'Hello World!';
          cd.detectChanges();

          var elInj = view.elementInjectors[0];
          expect(elInj.get(MyDir).dirProp).toEqual('Hello World!');
          done();
        });
      });

      it('should support nested components.', (done) => {
        compiler.compile(MyComp, createElement('<child-cmp></child-cmp>')).then((pv) => {
          createView(pv);

          cd.detectChanges();

          expect(view.nodes[0].shadowRoot.childNodes[0].nodeValue).toEqual('hello');
          done();
        });
      });
    });
  });
}

@Decorator({
  selector: '[my-dir]',
  bind: {'elprop':'dirProp'}
})
class MyDir {
  constructor() {
    this.dirProp = '';
  }
}

@Component({
  template: new TemplateConfig({
    directives: [MyDir, ChildComp]
  })
})
class MyComp {
  constructor() {
    this.ctxProp = 'initial value';
  }
}

@Component({
  selector: 'child-cmp',
  componentServices: [MyService],
  template: new TemplateConfig({
    directives: [MyDir],
    inline: '{{ctxProp}}'
  })
})
class ChildComp {
  constructor(service: MyService) {
    this.ctxProp = service.greeting;
  }
}

class MyService {
  constructor() {
    this.greeting = 'hello';
  }
}


function createElement(html) {
  return DOM.createTemplate(html).content.firstChild;
}
