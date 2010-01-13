test:
	@find test/*.dirty 2&> /dev/null | xargs rm
	@find test/test-*.js | xargs -n 1 -t node

benchmark:
	@find benchmark/*.dirty 2&> /dev/null | xargs rm
	@find benchmark/*.js | xargs -n 1 -t node
	
.PHONY: test benchmark