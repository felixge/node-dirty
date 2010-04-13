test:
	@find test/simple/test-*.js | xargs -n 1 -t node

benchmark:
	@find benchmark/*.dirty | xargs rm
	@find benchmark/*.js | xargs -n 1 -t node
	
.PHONY: test benchmark